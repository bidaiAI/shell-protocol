import { SignJWT, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'
import type { Context } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET env var is required') })()
)

// In-memory nonce store. Replace with Redis in production.
const nonceStore = new Map<string, { nonce: string, expiresAt: number }>()

const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Generate a nonce for wallet authentication */
export function generateNonce(walletAddress: string): string {
  const nonce = nanoid(32)
  nonceStore.set(walletAddress, {
    nonce,
    expiresAt: Date.now() + NONCE_TTL_MS,
  })

  // Cleanup expired nonces periodically
  if (nonceStore.size > 5000) {
    const now = Date.now()
    for (const [key, val] of nonceStore) {
      if (val.expiresAt < now) nonceStore.delete(key)
    }
  }

  return nonce
}

/** Verify a Solana wallet signature (Ed25519) */
export function verifySolanaSignature(walletAddress: string, signature: string, message: string): boolean {
  try {
    const publicKey = bs58.decode(walletAddress)
    const sig = bs58.decode(signature)
    const msgBytes = new TextEncoder().encode(message)
    return nacl.sign.detached.verify(msgBytes, sig, publicKey)
  }
  catch {
    return false
  }
}

/** Verify nonce and consume it */
function verifyAndConsumeNonce(walletAddress: string, nonce: string): boolean {
  const stored = nonceStore.get(walletAddress)
  if (!stored) return false
  if (stored.nonce !== nonce) return false
  if (stored.expiresAt < Date.now()) {
    nonceStore.delete(walletAddress)
    return false
  }
  nonceStore.delete(walletAddress)
  return true
}

/** Build the message to be signed by the wallet */
export function buildSignMessage(walletAddress: string, nonce: string): string {
  return `Sign in to $SHELL Protocol\n\nWallet: ${walletAddress}\nNonce: ${nonce}`
}

/** Login: verify signature, upsert user, return JWT */
export async function login(walletAddress: string, signature: string, nonce: string, referralCode?: string) {
  // 1. Verify nonce
  if (!verifyAndConsumeNonce(walletAddress, nonce)) {
    throw new Error('Invalid or expired nonce')
  }

  // 2. Build expected message and verify signature
  const message = buildSignMessage(walletAddress, nonce)
  const valid = verifySolanaSignature(walletAddress, signature, message)
  if (!valid) {
    throw new Error('Invalid signature')
  }

  // 3. Upsert user
  let [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1)

  if (!user) {
    // New user — create
    const newReferralCode = nanoid(8)
    let referredById: string | undefined

    // Resolve referral
    if (referralCode) {
      const [referrer] = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1)
      if (referrer) referredById = referrer.id
    }

    const [created] = await db.insert(users).values({
      walletAddress,
      referralCode: newReferralCode,
      referredBy: referredById ?? null,
    }).returning()

    user = created
  }

  if (user.isBanned) {
    throw new Error('Account banned')
  }

  // 4. Issue JWT (1 hour expiry)
  const token = await new SignJWT({
    sub: user.id,
    wallet: user.walletAddress,
    tier: user.tier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET)

  return { token, user }
}

/** Verify JWT and return payload */
export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as { sub: string, wallet: string, tier: string }
}

/** Hono middleware for auth */
export function authMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization token' }, 401)
    }

    try {
      const payload = await verifyToken(authHeader.slice(7))
      c.set('userId', payload.sub)
      c.set('wallet', payload.wallet)
      c.set('tier', payload.tier)
      await next()
    }
    catch {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }
}
