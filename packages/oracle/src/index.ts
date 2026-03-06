import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { auth } from './routes/auth.js'
import { taskRoutes } from './routes/tasks.js'
import { leaderboard } from './routes/leaderboard.js'
import { startVerifyWorker, verifyQueue } from './tasks/queue.js'
import { seedTaskBatch, reclaimStaleTasks } from './tasks/dispatcher.js'
import { ALL_PROFILES } from './tasks/templates/agent-profiles.js'
import { rateLimiter } from './middleware/rate-limit.js'
import { logger } from './lib/logger.js'
import { db } from './db/client.js'
import { sql } from 'drizzle-orm'

const app = new Hono()

// ── Middleware ──
app.use('/*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}))

app.use('/*', async (c, next) => {
  const start = Date.now()
  await next()
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: Date.now() - start,
  }, 'request')
})

app.use('/auth/*', rateLimiter({ windowMs: 60_000, max: 10 }))
app.use('/tasks/*', rateLimiter({ windowMs: 60_000, max: 30 }))
app.use('/leaderboard/*', rateLimiter({ windowMs: 60_000, max: 60 }))

// ── Routes ──
app.route('/auth', auth)
app.route('/tasks', taskRoutes)
app.route('/leaderboard', leaderboard)

// ── Health check ──
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: '$SHELL Protocol Oracle',
    version: '0.2.0',
    timestamp: new Date().toISOString(),
  })
})

// ── Global stats (with simple cache) ──
let statsCache: { data: unknown, expiresAt: number } | null = null

app.get('/stats', async (c) => {
  if (statsCache && statsCache.expiresAt > Date.now()) {
    return c.json(statsCache.data)
  }
  const [stats] = await db.execute(sql`
    SELECT
      COUNT(DISTINCT CASE WHEN NOT is_banned THEN id END) AS total_miners,
      COALESCE(SUM(total_tasks_completed), 0) AS total_tasks_completed,
      COALESCE(SUM(total_successful_attacks), 0) AS total_successful_attacks,
      COALESCE(SUM(shell_points), 0) AS total_points_distributed
    FROM users
  `)
  statsCache = { data: stats, expiresAt: Date.now() + 30_000 }
  return c.json(stats)
})

// ── Start server + workers + crons ──
const port = Number(process.env.PORT) || 3100

// Start BullMQ sandbox verification worker
const worker = startVerifyWorker()
logger.info('Sandbox verification worker started')

// Seed initial tasks if pool is empty
async function ensureTaskPool() {
  const [{ count }] = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*) AS count FROM tasks WHERE status = 'pending'`,
  )
  if (Number(count) < 50) {
    const result = await seedTaskBatch(ALL_PROFILES, 200)
    logger.info(result, 'Auto-seeded task pool')
  }
}
ensureTaskPool().catch(err => logger.error({ err }, 'Failed to seed task pool'))

// Periodic task reclaim (every 5 minutes) — recycles stale assigned tasks
const reclaimInterval = setInterval(async () => {
  try {
    await reclaimStaleTasks()
  }
  catch (err) {
    logger.error({ err }, 'Failed to reclaim stale tasks')
  }
}, 5 * 60 * 1000)

// Periodic task pool replenishment (every 30 minutes)
const replenishInterval = setInterval(async () => {
  try {
    await ensureTaskPool()
  }
  catch (err) {
    logger.error({ err }, 'Failed to replenish task pool')
  }
}, 30 * 60 * 1000)

serve({ fetch: app.fetch, port }, () => {
  logger.info({ port }, '$SHELL Oracle running')
})

// ── Graceful shutdown ──
async function shutdown() {
  logger.info('Shutting down...')
  clearInterval(reclaimInterval)
  clearInterval(replenishInterval)
  await worker.close()
  await verifyQueue.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export default app
