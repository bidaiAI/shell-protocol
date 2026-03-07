import nacl from 'tweetnacl'
import bs58 from 'bs58'
import type { MinerConfig } from './config.js'

export interface AuthResult {
  token: string
  user: {
    id: string
    walletAddress: string | null
    agentName?: string | null
    tier: string
    shellPoints: number
    referralCode: string
  }
}

/** Derive public key (wallet address) from private key */
export function getWalletAddress(privateKeyBase58: string): string {
  const privateKey = bs58.decode(privateKeyBase58)
  const keypair = nacl.sign.keyPair.fromSecretKey(privateKey)
  return bs58.encode(keypair.publicKey)
}

/** Sign a message with the wallet private key */
export function signMessage(message: string, privateKeyBase58: string): string {
  const privateKey = bs58.decode(privateKeyBase58)
  const messageBytes = new TextEncoder().encode(message)
  const signature = nacl.sign.detached(messageBytes, privateKey)
  return bs58.encode(signature)
}

/** Authenticate with the Oracle using Solana wallet private key → JWT */
export async function authenticate(config: MinerConfig, referralCode?: string): Promise<AuthResult> {
  const walletAddress = getWalletAddress(config.walletPrivateKey)

  // Step 1: Get nonce
  const nonceRes = await fetch(`${config.oracleUrl}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  })

  if (!nonceRes.ok) {
    throw new Error(`Failed to get nonce: ${nonceRes.statusText}`)
  }

  const { nonce, message } = await nonceRes.json() as { nonce: string, message: string }

  // Step 2: Sign message
  const signature = signMessage(message, config.walletPrivateKey)

  // Step 3: Login
  const loginRes = await fetch(`${config.oracleUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, signature, nonce, referralCode }),
  })

  if (!loginRes.ok) {
    let errorMsg: string
    try {
      const err = await loginRes.json() as { error: string }
      errorMsg = err.error
    }
    catch {
      errorMsg = loginRes.statusText || `HTTP ${loginRes.status}`
    }
    throw new Error(`Login failed: ${errorMsg}`)
  }

  const data = await loginRes.json() as {
    token: string
    user: { id: string, walletAddress: string, tier: string, shellPoints: number, referralCode: string }
  }
  return {
    token: data.token,
    user: {
      id: data.user.id,
      walletAddress: data.user.walletAddress,
      tier: data.user.tier,
      shellPoints: data.user.shellPoints,
      referralCode: data.user.referralCode,
    },
  }
}

/** Authenticate with the Oracle using sk-shell-xxx API Key */
export async function authenticateWithApiKey(config: MinerConfig): Promise<AuthResult> {
  const res = await fetch(`${config.oracleUrl}/leaderboard/me`, {
    headers: { Authorization: `Bearer ${config.shellApiKey}` },
  })

  if (!res.ok) {
    let errorMsg: string
    try {
      const err = await res.json() as { error: string }
      errorMsg = err.error
    }
    catch {
      errorMsg = res.statusText || `HTTP ${res.status}`
    }
    throw new Error(`API key authentication failed: ${errorMsg}`)
  }

  const user = await res.json() as {
    id: string
    walletAddress?: string | null
    agentName?: string | null
    tier: string
    shellPoints: number
    referralCode: string
  }

  return {
    token: config.shellApiKey,  // API key is used directly as Bearer token
    user: {
      id: user.id,
      walletAddress: user.walletAddress ?? null,
      agentName: user.agentName ?? null,
      tier: user.tier,
      shellPoints: user.shellPoints,
      referralCode: user.referralCode,
    },
  }
}

/**
 * Auto-select authentication method based on config:
 * - If SHELL_API_KEY is set → use API key auth (no wallet needed)
 * - If WALLET_PRIVATE_KEY is set → use SIWE wallet auth
 */
export async function autoAuthenticate(config: MinerConfig, referralCode?: string): Promise<AuthResult> {
  if (config.shellApiKey) {
    return authenticateWithApiKey(config)
  }
  return authenticate(config, referralCode)
}
