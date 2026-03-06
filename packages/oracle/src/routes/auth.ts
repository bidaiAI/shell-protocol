import { Hono } from 'hono'
import { generateNonce, buildSignMessage, login } from '../auth/siwe.js'

const auth = new Hono()

/** Step 1: Client requests a nonce to sign */
auth.post('/nonce', async (c) => {
  const { walletAddress } = await c.req.json<{ walletAddress: string }>()

  if (!walletAddress || walletAddress.length < 20) {
    return c.json({ error: 'Invalid wallet address' }, 400)
  }

  const nonce = generateNonce(walletAddress)
  const message = buildSignMessage(walletAddress, nonce)

  return c.json({ nonce, message })
})

/** Step 2: Client signs the message and submits for JWT */
auth.post('/login', async (c) => {
  const { walletAddress, signature, nonce, referralCode } = await c.req.json<{
    walletAddress: string
    signature: string
    nonce: string
    referralCode?: string
  }>()

  if (!walletAddress || !signature || !nonce) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  try {
    const result = await login(walletAddress, signature, nonce, referralCode)
    return c.json({
      token: result.token,
      user: {
        id: result.user.id,
        walletAddress: result.user.walletAddress,
        tier: result.user.tier,
        shellPoints: result.user.shellPoints,
        referralCode: result.user.referralCode,
      },
    })
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed'
    return c.json({ error: message }, 401)
  }
})

export { auth }
