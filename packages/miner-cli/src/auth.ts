import nacl from 'tweetnacl'
import bs58 from 'bs58'
import type { MinerConfig } from './config.js'

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

/** Authenticate with the Oracle and get a JWT */
export async function authenticate(config: MinerConfig, referralCode?: string): Promise<{
  token: string
  user: { id: string, walletAddress: string, tier: string, shellPoints: number, referralCode: string }
}> {
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

  return loginRes.json() as Promise<{
    token: string
    user: { id: string, walletAddress: string, tier: string, shellPoints: number, referralCode: string }
  }>
}
