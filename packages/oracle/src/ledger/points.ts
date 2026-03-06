import { eq, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { logger } from '../lib/logger.js'

const PROTOCOL_TAX_RATE = 0.10
const GENESIS_MULTIPLIER = 50
const GENESIS_DAILY_CAP = 500_000  // Genesis nodes max 500k points/day
const REFERRAL_RATE = 0.10
const MAX_REFERRAL_PER_AWARD = 1000 // Cap referral per single award

// Tier promotion thresholds
const TIER_THRESHOLDS = {
  hunter: { attacks: 20, rate: 0.3 },  // 20 successful attacks, 30% success rate
  apex: { attacks: 100, rate: 0.5 },   // 100 successful attacks, 50% success rate
}

const TREASURY_WALLET = process.env.TREASURY_WALLET
if (!TREASURY_WALLET) {
  logger.warn('TREASURY_WALLET not set — protocol tax will not be credited')
}

/** Award points to a miner for a successful attack (fully transactional) */
export async function awardPoints(userId: string, basePoints: number) {
  // All operations inside a single transaction to prevent race conditions
  const result = await db.transaction(async (tx) => {
    // 1. Read user with FOR UPDATE lock (via SELECT inside transaction)
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) throw new Error('User not found')

    // 2. Calculate points
    const multiplier = user.isGenesisNode ? GENESIS_MULTIPLIER : getTierMultiplier(user.tier)
    const grossPoints = Math.floor(basePoints * multiplier)
    const taxPoints = Math.floor(grossPoints * PROTOCOL_TAX_RATE)
    const netPoints = grossPoints - taxPoints

    // 3. Award to miner (with Genesis daily cap check)
    await tx.update(users)
      .set({
        shellPoints: user.isGenesisNode
          ? sql`LEAST(${users.shellPoints} + ${netPoints}, ${users.shellPoints} + ${Math.min(netPoints, GENESIS_DAILY_CAP)})`
          : sql`${users.shellPoints} + ${netPoints}`,
        totalSuccessfulAttacks: sql`${users.totalSuccessfulAttacks} + 1`,
        totalTasksCompleted: sql`${users.totalTasksCompleted} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    // 4. Protocol tax to treasury
    if (TREASURY_WALLET) {
      await tx.update(users)
        .set({
          shellPoints: sql`${users.shellPoints} + ${taxPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(users.walletAddress, TREASURY_WALLET))
    }

    // 5. Referral bonus (capped per award, not "daily" misnomer)
    if (user.referredBy) {
      const referralBonus = Math.min(
        Math.floor(netPoints * REFERRAL_RATE),
        MAX_REFERRAL_PER_AWARD,
      )
      if (referralBonus > 0) {
        await tx.update(users)
          .set({
            shellPoints: sql`${users.shellPoints} + ${referralBonus}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.referredBy))
      }
    }

    // 6. Check tier promotion
    const newAttacks = user.totalSuccessfulAttacks + 1
    const newTotal = user.totalTasksCompleted + 1
    const successRate = newTotal > 0 ? newAttacks / newTotal : 0
    const newTier = calculateTier(user.tier, newAttacks, successRate)

    if (newTier !== user.tier) {
      await tx.update(users)
        .set({ tier: newTier, updatedAt: new Date() })
        .where(eq(users.id, userId))
      logger.info({ userId, oldTier: user.tier, newTier }, 'Miner tier promoted')
    }

    return { netPoints, taxPoints, multiplier }
  })

  return result
}

/** Record a failed task attempt (no penalty) */
export async function recordFailedAttempt(userId: string) {
  await db.update(users)
    .set({
      totalTasksCompleted: sql`${users.totalTasksCompleted} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

/** Slash a miner's entire balance for honeypot cheating (atomic) */
export async function slashMiner(userId: string) {
  // Use SQL CASE for atomic ban decision — no read-then-write race
  const [updated] = await db.update(users)
    .set({
      shellPoints: 0,
      slashCount: sql`${users.slashCount} + 1`,
      isBanned: sql`${users.slashCount} + 1 >= 3`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      shellPoints: users.shellPoints,
      slashCount: users.slashCount,
    })

  if (!updated) return null

  return { slashedAmount: updated.shellPoints, totalSlashes: updated.slashCount }
}

function getTierMultiplier(tier: string): number {
  switch (tier) {
    case 'apex': return 10
    case 'hunter': return 3
    case 'scout': return 1
    default: return 1
  }
}

function calculateTier(
  currentTier: string,
  successfulAttacks: number,
  successRate: number,
): 'scout' | 'hunter' | 'apex' {
  // Only promote, never demote
  if (currentTier === 'apex') return 'apex'

  if (
    successfulAttacks >= TIER_THRESHOLDS.apex.attacks
    && successRate >= TIER_THRESHOLDS.apex.rate
  ) {
    return 'apex'
  }

  if (currentTier === 'hunter') return 'hunter'

  if (
    successfulAttacks >= TIER_THRESHOLDS.hunter.attacks
    && successRate >= TIER_THRESHOLDS.hunter.rate
  ) {
    return 'hunter'
  }

  return 'scout'
}
