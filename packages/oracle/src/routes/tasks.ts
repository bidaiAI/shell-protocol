import { Hono } from 'hono'
import type { AuthEnv } from '../types.js'
import { authMiddleware } from '../auth/siwe.js'
import { pollTask } from '../tasks/dispatcher.js'
import { verifyHoneypotResponse } from '../tasks/honeypot.js'
import { awardPoints, slashMiner } from '../ledger/points.js'
import { enqueueVerification } from '../tasks/queue.js'
import { db } from '../db/client.js'
import { tasks, submissions } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { logger } from '../lib/logger.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const taskRoutes = new Hono<AuthEnv>()

// All task routes require authentication
taskRoutes.use('/*', authMiddleware())

/** Poll for the next available task */
taskRoutes.get('/poll', async (c) => {
  const userId = c.get('userId')
  const tier = c.get('tier')

  const task = await pollTask(userId, tier)

  if (!task) {
    return c.json({ task: null, message: 'No tasks available. Try again later.' })
  }

  return c.json({ task })
})

/** Submit a payload for a task */
taskRoutes.post('/submit', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ taskId?: string, payload?: string }>()
  const { taskId, payload } = body

  // Input validation
  if (!taskId || !payload) {
    return c.json({ error: 'Missing taskId or payload' }, 400)
  }
  if (!UUID_RE.test(taskId)) {
    return c.json({ error: 'Invalid taskId format' }, 400)
  }
  if (payload.length > 10000) {
    return c.json({ error: 'Payload too long (max 10000 chars)' }, 400)
  }

  // Get the task
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)

  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }

  // Verify assignment ownership — only the assigned miner can submit
  if (task.assignedTo !== userId) {
    return c.json({ error: 'Task not assigned to you' }, 403)
  }

  if (task.status !== 'assigned') {
    return c.json({ error: `Task cannot accept submissions (status: ${task.status})` }, 400)
  }

  // ── Honeypot check ──
  if (task.isHoneypot) {
    const passedHoneypot = task.honeypotExpected
      ? verifyHoneypotResponse(payload, task.honeypotExpected)
      : false

    if (!passedHoneypot) {
      const slashResult = await slashMiner(userId)

      await db.insert(submissions).values({
        taskId,
        userId,
        payload,
        canaryTriggered: false,
        isValid: false,
        pointsAwarded: 0,
      })

      await db.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, taskId))

      return c.json({
        result: 'slashed',
        message: 'Honeypot detection failed. Your points balance has been reset to zero.',
        slashedAmount: slashResult?.slashedAmount ?? 0,
      })
    }

    // Passed honeypot — award small bonus
    const award = await awardPoints(userId, task.rewardPoints)

    await db.insert(submissions).values({
      taskId,
      userId,
      payload,
      canaryTriggered: true,
      triggeredActions: ['honeypot_detected'],
      isValid: true,
      pointsAwarded: award.netPoints,
      verifiedAt: new Date(),
    })

    await db.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, taskId))

    return c.json({
      result: 'success',
      message: 'Honeypot correctly identified!',
      pointsAwarded: award.netPoints,
    })
  }

  // ── Normal task: enqueue for async sandbox verification ──
  const [submission] = await db.insert(submissions).values({
    taskId,
    userId,
    payload,
    canaryTriggered: false,
    isValid: false,
    pointsAwarded: 0,
  }).returning()

  // Mark task as verifying (not completed — will be finalized by sandbox worker)
  await db.update(tasks).set({ status: 'verifying' }).where(eq(tasks.id, taskId))

  // Queue sandbox verification
  const jobId = await enqueueVerification({
    submissionId: submission.id,
    taskId,
    userId,
    payload,
    agentProfile: task.targetAgentProfile,
  })

  logger.info({ submissionId: submission.id, taskId, jobId }, 'Submission queued for verification')

  return c.json({
    result: 'submitted',
    submissionId: submission.id,
    message: 'Payload submitted. Sandbox verification in progress...',
  })
})

/** Query verification result for a submission */
taskRoutes.get('/result/:submissionId', async (c) => {
  const userId = c.get('userId')
  const { submissionId } = c.req.param()

  if (!UUID_RE.test(submissionId)) {
    return c.json({ error: 'Invalid submissionId format' }, 400)
  }

  const [submission] = await db.select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.userId, userId)))
    .limit(1)

  if (!submission) {
    return c.json({ error: 'Submission not found' }, 404)
  }

  return c.json({
    submissionId: submission.id,
    taskId: submission.taskId,
    status: submission.verifiedAt ? 'verified' : 'pending',
    canaryTriggered: submission.canaryTriggered,
    isValid: submission.isValid,
    pointsAwarded: submission.pointsAwarded,
    verifiedAt: submission.verifiedAt,
    submittedAt: submission.submittedAt,
  })
})

/** List recent submissions for the current miner */
taskRoutes.get('/my-submissions', async (c) => {
  const userId = c.get('userId')
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  const results = await db.select({
    id: submissions.id,
    taskId: submissions.taskId,
    canaryTriggered: submissions.canaryTriggered,
    isValid: submissions.isValid,
    pointsAwarded: submissions.pointsAwarded,
    verifiedAt: submissions.verifiedAt,
    submittedAt: submissions.submittedAt,
  })
    .from(submissions)
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit)

  return c.json({ submissions: results })
})

export { taskRoutes }
