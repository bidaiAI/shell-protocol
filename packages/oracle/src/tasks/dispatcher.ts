import { eq, and, sql, lt } from 'drizzle-orm'
import { db } from '../db/client.js'
import { tasks, type AgentProfileData } from '../db/schema.js'
import { injectHoneypots } from './honeypot.js'
import { logger } from '../lib/logger.js'

const HONEYPOT_RATIO = 0.05 // 5% of tasks are honeypots
const TASK_ASSIGNMENT_TTL_MINUTES = 30 // Assigned tasks expire after 30 min

/** Sanitize agent profile: strip canary actions and other secrets before sending to miners */
function sanitizeProfileForMiner(profile: AgentProfileData): Omit<AgentProfileData, 'canaryActions'> & { canaryActions?: never } {
  const { canaryActions, ...safe } = profile
  return safe
}

/** Get the next available task for a miner based on their tier (atomic assignment) */
export async function pollTask(userId: string, tier: string) {
  const maxDifficulty = tier === 'apex' ? 4 : tier === 'hunter' ? 3 : 2

  // Atomic UPDATE ... RETURNING to prevent race conditions
  const [assigned] = await db.update(tasks)
    .set({
      status: 'assigned',
      assignedTo: userId,
      assignedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.status, 'pending'),
        sql`${tasks.difficulty} <= ${maxDifficulty}`,
        sql`(${tasks.expiresAt} IS NULL OR ${tasks.expiresAt} > NOW())`,
        sql`${tasks.id} = (
          SELECT id FROM tasks
          WHERE status = 'pending'
            AND difficulty <= ${maxDifficulty}
            AND (expires_at IS NULL OR expires_at > NOW())
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )`,
      ),
    )
    .returning({
      id: tasks.id,
      taskType: tasks.taskType,
      difficulty: tasks.difficulty,
      targetAgentProfile: tasks.targetAgentProfile,
      targetChain: tasks.targetChain,
      injectionSurface: tasks.injectionSurface,
      rewardPoints: tasks.rewardPoints,
      expiresAt: tasks.expiresAt,
    })

  if (!assigned) return null

  // Strip canary actions — miners must NOT know what triggers success
  return {
    ...assigned,
    targetAgentProfile: sanitizeProfileForMiner(assigned.targetAgentProfile),
  }
}

/**
 * Reclaim stale assigned tasks back to pending.
 * Should be called periodically (e.g., every 5 minutes via cron or setInterval).
 */
export async function reclaimStaleTasks() {
  const cutoff = new Date(Date.now() - TASK_ASSIGNMENT_TTL_MINUTES * 60 * 1000)

  const reclaimed = await db.update(tasks)
    .set({
      status: 'pending',
      assignedTo: null,
      assignedAt: null,
    })
    .where(
      and(
        eq(tasks.status, 'assigned'),
        lt(tasks.assignedAt!, cutoff),
      ),
    )
    .returning({ id: tasks.id })

  if (reclaimed.length > 0) {
    logger.info({ count: reclaimed.length }, 'Reclaimed stale assigned tasks')
  }

  return reclaimed.length
}

/** Seed the task pool with a batch of tasks from agent profiles */
export async function seedTaskBatch(profiles: AgentProfileData[], count: number) {
  const taskBatch: Array<typeof tasks.$inferInsert> = []
  const honeypotCount = Math.ceil(count * HONEYPOT_RATIO)
  const normalCount = count - honeypotCount

  for (let i = 0; i < normalCount; i++) {
    const profile = profiles[i % profiles.length]
    taskBatch.push({
      taskType: mapDifficultyToType(profile),
      difficulty: getDifficulty(profile.defenseLevel),
      targetAgentProfile: profile,
      targetChain: profile.targetChain,
      canaryActions: profile.canaryActions,
      injectionSurface: profile.injectionSurface,
      isHoneypot: false,
      rewardPoints: getRewardPoints(profile.defenseLevel),
    })
  }

  const honeypots = injectHoneypots(honeypotCount, profiles)
  taskBatch.push(...honeypots)

  if (taskBatch.length > 0) {
    for (let i = 0; i < taskBatch.length; i += 100) {
      const chunk = taskBatch.slice(i, i + 100)
      await db.insert(tasks).values(chunk)
    }
  }

  logger.info({ seeded: taskBatch.length, honeypots: honeypotCount }, 'Task pool seeded')
  return { seeded: taskBatch.length, honeypots: honeypotCount }
}

function mapDifficultyToType(profile: AgentProfileData) {
  if (profile.injectionSurface === 'multi_turn') return 'memory_poisoning' as const
  if (profile.injectionSurface === 'chat_message' || profile.injectionSurface === 'email') return 'social_engineering' as const
  return 'token_injection' as const
}

function getDifficulty(defenseLevel: string): number {
  switch (defenseLevel) {
    case 'none': return 1
    case 'basic': return 2
    case 'advanced': return 3
    default: return 1
  }
}

function getRewardPoints(defenseLevel: string): number {
  switch (defenseLevel) {
    case 'none': return 100
    case 'basic': return 500
    case 'advanced': return 2000
    default: return 100
  }
}
