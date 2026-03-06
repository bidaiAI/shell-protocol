import { Hono } from 'hono'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users, submissions } from '../db/schema.js'
import { authMiddleware } from '../auth/siwe.js'
import type { AuthEnv } from '../types.js'

const leaderboard = new Hono<AuthEnv>()

/** Public: Get top miners by points */
leaderboard.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100)
  const offset = Number(c.req.query('offset')) || 0

  const topMiners = await db.select({
    walletAddress: users.walletAddress,
    tier: users.tier,
    shellPoints: users.shellPoints,
    totalSuccessfulAttacks: users.totalSuccessfulAttacks,
    totalTasksCompleted: users.totalTasksCompleted,
  })
    .from(users)
    .where(eq(users.isBanned, false))
    .orderBy(desc(users.shellPoints))
    .limit(limit)
    .offset(offset)

  return c.json({ leaderboard: topMiners })
})

/** Protected: Get current user's stats */
leaderboard.get('/me', authMiddleware(), async (c) => {
  const userId = c.get('userId') as string

  const [user] = await db.select({
    walletAddress: users.walletAddress,
    tier: users.tier,
    shellPoints: users.shellPoints,
    totalSuccessfulAttacks: users.totalSuccessfulAttacks,
    totalTasksCompleted: users.totalTasksCompleted,
    referralCode: users.referralCode,
    slashCount: users.slashCount,
    createdAt: users.createdAt,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const successRate = user.totalTasksCompleted > 0
    ? (user.totalSuccessfulAttacks / user.totalTasksCompleted * 100).toFixed(1)
    : '0.0'

  return c.json({
    ...user,
    successRate: `${successRate}%`,
  })
})

/** Protected: Get referral stats */
leaderboard.get('/me/referral', authMiddleware(), async (c) => {
  const userId = c.get('userId') as string

  const [user] = await db.select({
    referralCode: users.referralCode,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Count referred users and their total points earned
  const [referralStats] = await db.execute<{
    referred_count: number
    total_referral_points: number
  }>(sql`
    SELECT
      COUNT(*)::int AS referred_count,
      COALESCE(SUM(
        LEAST(FLOOR(s.points_awarded * 0.10), 1000)
      ), 0)::int AS total_referral_points
    FROM users u
    LEFT JOIN submissions s ON s.user_id = u.id AND s.is_valid = true
    WHERE u.referred_by = ${userId}
  `)

  return c.json({
    referralCode: user.referralCode,
    referredCount: referralStats?.referred_count ?? 0,
    totalReferralEarnings: referralStats?.total_referral_points ?? 0,
  })
})

export { leaderboard }
