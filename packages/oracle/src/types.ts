/** Hono environment type with auth variables set by authMiddleware */
export type AuthEnv = {
  Variables: {
    userId: string
    wallet: string
    tier: string
  }
}
