import { Queue, Worker, type Job } from 'bullmq'
import { db } from '../db/client.js'
import { submissions, tasks } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { awardPoints, recordFailedAttempt } from '../ledger/points.js'
import type { AgentProfileData } from '../db/schema.js'
import { logger } from '../lib/logger.js'

// ── Redis connection ──

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null, // Required by BullMQ
  }
}

const redisOpts = parseRedisUrl(REDIS_URL)

// ── Sandbox result type (mirrored from @shell/sandbox to avoid cross-package import) ──

interface SandboxVerification {
  success: boolean
  triggeredActions: { name: string, arguments: Record<string, unknown> }[]
  totalActions: number
  details: string
}

interface SandboxResult {
  verification: SandboxVerification
  severity: number
  actionLog: unknown[]
  agentResponse: string
  tokensUsed: { input: number, output: number }
}

// ── Queue definition ──

export interface VerifyJobData {
  submissionId: string
  taskId: string
  userId: string
  payload: string
  agentProfile: AgentProfileData
}

export const verifyQueue = new Queue<VerifyJobData>('sandbox-verify', {
  connection: redisOpts,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
})

/** Enqueue a submission for async sandbox verification */
export async function enqueueVerification(data: VerifyJobData) {
  const job = await verifyQueue.add('verify', data, {
    priority: 1,
  })
  logger.info({ jobId: job.id, submissionId: data.submissionId }, 'Verification job enqueued')
  return job.id
}

// ── Sandbox loader (lazy, avoids rootDir issues) ──

let _runSandbox: ((profile: AgentProfileData, payload: string) => Promise<SandboxResult>) | null = null

async function getSandboxRunner() {
  if (!_runSandbox) {
    // Use a variable to prevent TypeScript from following the import path at compile time
    const sandboxPath = '../../../sandbox/src/executor.js'
    const mod = await import(/* @vite-ignore */ sandboxPath)
    _runSandbox = mod.runSandbox
  }
  return _runSandbox!
}

// ── Worker: processes sandbox verification jobs ──

export function startVerifyWorker() {
  const worker = new Worker<VerifyJobData>(
    'sandbox-verify',
    async (job: Job<VerifyJobData>) => {
      const { submissionId, userId, payload, agentProfile } = job.data

      logger.info({ jobId: job.id, submissionId }, 'Starting sandbox verification')

      const runSandbox = await getSandboxRunner()
      let result: SandboxResult

      try {
        result = await runSandbox(agentProfile, payload)
      }
      catch (err) {
        logger.error({ jobId: job.id, err }, 'Sandbox execution failed')
        await recordFailedAttempt(userId)
        await db.update(submissions)
          .set({
            isValid: false,
            canaryTriggered: false,
            verifiedAt: new Date(),
          })
          .where(eq(submissions.id, submissionId))
        throw err // Let BullMQ handle retry
      }

      const { verification, severity } = result

      const { taskId } = job.data

      if (verification.success) {
        const award = await awardPoints(userId, severity > 0 ? severity : 100)

        await db.update(submissions)
          .set({
            isValid: true,
            canaryTriggered: true,
            triggeredActions: verification.triggeredActions.map(a => a.name),
            pointsAwarded: award.netPoints,
            verifiedAt: new Date(),
          })
          .where(eq(submissions.id, submissionId))

        // Finalize task as completed (attack succeeded)
        await db.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, taskId))

        logger.info({
          submissionId,
          triggered: verification.triggeredActions.map(a => a.name),
          points: award.netPoints,
          severity,
        }, 'Attack verified — points awarded')
      }
      else {
        await recordFailedAttempt(userId)

        await db.update(submissions)
          .set({
            isValid: false,
            canaryTriggered: false,
            verifiedAt: new Date(),
          })
          .where(eq(submissions.id, submissionId))

        // Mark task as failed (attack did not succeed)
        await db.update(tasks).set({ status: 'failed' }).where(eq(tasks.id, taskId))

        logger.info({ submissionId }, 'Attack failed verification — no canary triggered')
      }

      return {
        success: verification.success,
        severity,
        triggeredCount: verification.triggeredActions.length,
      }
    },
    {
      connection: redisOpts,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60_000, // Max 10 jobs per minute (LLM cost control)
      },
    },
  )

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Verification job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Verification job failed')
  })

  return worker
}
