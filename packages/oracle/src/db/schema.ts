import { pgTable, uuid, varchar, boolean, integer, bigint, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core'

// ── Enums ──

export const tierEnum = pgEnum('tier', ['scout', 'hunter', 'apex'])

export const taskTypeEnum = pgEnum('task_type', [
  'token_injection',
  'social_engineering',
  'memory_poisoning',
  'full_chain',
])

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'assigned',
  'verifying',
  'completed',
  'failed',
  'expired',
])

// ── Users ──

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 128 }).notNull().unique(),
  isGenesisNode: boolean('is_genesis_node').notNull().default(false),
  tier: tierEnum('tier').notNull().default('scout'),
  shellPoints: bigint('shell_points', { mode: 'number' }).notNull().default(0),
  totalTasksCompleted: integer('total_tasks_completed').notNull().default(0),
  totalSuccessfulAttacks: integer('total_successful_attacks').notNull().default(0),
  slashCount: integer('slash_count').notNull().default(0),
  isBanned: boolean('is_banned').notNull().default(false),
  referralCode: varchar('referral_code', { length: 16 }).notNull().unique(),
  referredBy: uuid('referred_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('idx_users_shell_points').on(t.shellPoints),
  index('idx_users_is_banned').on(t.isBanned),
])

// ── Tasks ──

export interface AgentProfileData {
  id: string
  name: string
  model: string
  systemPrompt: string
  targetChain: string
  availableTools: { name: string, description: string, parameters: Record<string, unknown> }[]
  canaryActions: string[]
  defenseLevel: 'none' | 'basic' | 'advanced'
  injectionSurface: string
}

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskType: taskTypeEnum('task_type').notNull(),
  difficulty: integer('difficulty').notNull().default(1),
  targetAgentProfile: jsonb('target_agent_profile').notNull().$type<AgentProfileData>(),
  targetChain: varchar('target_chain', { length: 32 }).notNull().default('any'),
  canaryActions: jsonb('canary_actions').notNull().$type<string[]>(),
  injectionSurface: varchar('injection_surface', { length: 64 }).notNull(),
  isHoneypot: boolean('is_honeypot').notNull().default(false),
  honeypotExpected: jsonb('honeypot_expected').$type<Record<string, unknown> | null>(),
  rewardPoints: integer('reward_points').notNull().default(100),
  status: taskStatusEnum('status').notNull().default('pending'),
  assignedTo: uuid('assigned_to'),
  assignedAt: timestamp('assigned_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (t) => [
  index('idx_tasks_status_difficulty').on(t.status, t.difficulty),
  index('idx_tasks_expires_at').on(t.expiresAt),
  index('idx_tasks_assigned_to').on(t.assignedTo),
])

// ── Submissions ──

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  payload: varchar('payload', { length: 10000 }).notNull(),
  canaryTriggered: boolean('canary_triggered').notNull().default(false),
  triggeredActions: jsonb('triggered_actions').$type<string[]>(),
  isValid: boolean('is_valid').notNull().default(false),
  pointsAwarded: integer('points_awarded').notNull().default(0),
  verifiedAt: timestamp('verified_at'),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
}, (t) => [
  index('idx_submissions_user_id').on(t.userId),
  index('idx_submissions_task_id').on(t.taskId),
])

// ── Daily Settlements ──

export const dailySettlements = pgTable('daily_settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  epoch: integer('epoch').notNull().unique(),
  totalPointsDistributed: bigint('total_points_distributed', { mode: 'number' }).notNull().default(0),
  protocolTaxPoints: bigint('protocol_tax_points', { mode: 'number' }).notNull().default(0),
  merkleRoot: varchar('merkle_root', { length: 128 }),
  settledAt: timestamp('settled_at').notNull().defaultNow(),
  txHash: varchar('tx_hash', { length: 128 }),
})
