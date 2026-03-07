import { ref, computed } from 'vue'
import {
  requestNonce,
  login,
  setToken,
  loginWithEmail as apiLoginEmail,
  registerEmail as apiRegisterEmail,
  bindWalletToAccount,
  requestBindWalletChallenge,
} from './api'

export interface WalletState {
  connected: boolean
  address: string | null
  publicKey: Uint8Array | null
}

const walletState = ref<WalletState>({
  connected: false,
  address: null,
  publicKey: null,
})

const isAuthenticated = ref(false)
const userEmail = ref<string | null>(null)
const authMethod = ref<'wallet' | 'email' | 'apikey' | null>(null)

export function useWallet() {
  const connected = computed(() => walletState.value.connected)
  const address = computed(() => walletState.value.address)
  const shortAddress = computed(() => {
    const addr = walletState.value.address
    if (!addr) return ''
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  })
  const displayName = computed(() => {
    if (walletState.value.address) return `${walletState.value.address.slice(0, 4)}...${walletState.value.address.slice(-4)}`
    if (userEmail.value) return userEmail.value.length > 20 ? `${userEmail.value.slice(0, 17)}...` : userEmail.value
    return ''
  })

  async function connect() {
    const phantom = (window as Window & { solana?: PhantomProvider }).solana
    if (!phantom?.isPhantom) {
      window.open('https://phantom.app/', '_blank')
      throw new Error('Phantom wallet not found. Please install it.')
    }

    const resp = await phantom.connect()
    const pubkey = resp.publicKey
    walletState.value = {
      connected: true,
      address: pubkey.toString(),
      publicKey: pubkey.toBytes(),
    }

    // Extract referral code from URL if present
    const params = new URLSearchParams(window.location.search)
    const referralCode = params.get('ref') || undefined

    // Auto-authenticate after connecting
    await authenticate(referralCode)
  }

  async function authenticate(referralCode?: string) {
    const addr = walletState.value.address
    if (!addr) throw new Error('Wallet not connected')

    const phantom = (window as Window & { solana?: PhantomProvider }).solana
    if (!phantom) throw new Error('Phantom wallet not found')

    // 1. Request nonce
    const { nonce, message } = await requestNonce(addr)

    // 2. Sign message with wallet
    const encoded = new TextEncoder().encode(message)
    const { signature } = await phantom.signMessage(encoded, 'utf8')

    // 3. Encode signature to base58 for the API
    const sig58 = encodeBase58(signature)

    // 4. Login
    const result = await login(addr, sig58, nonce, referralCode)
    setToken(result.token)
    isAuthenticated.value = true

    return result
  }

  async function loginEmail(email: string, password: string) {
    const result = await apiLoginEmail(email, password)
    setToken(result.token)
    userEmail.value = email
    authMethod.value = 'email'
    isAuthenticated.value = true
    if (result.user.walletAddress) {
      walletState.value = { connected: true, address: result.user.walletAddress, publicKey: null }
    }
    return result
  }

  async function registerEmailUser(email: string, password: string, referralCode?: string) {
    return apiRegisterEmail(email, password, referralCode)
  }

  function loginWithToken(token: string, email?: string) {
    setToken(token)
    if (email) userEmail.value = email
    authMethod.value = 'email'
    isAuthenticated.value = true
  }

  async function bindWallet() {
    const phantom = (window as Window & { solana?: PhantomProvider }).solana
    if (!phantom?.isPhantom) {
      window.open('https://phantom.app/', '_blank')
      throw new Error('请先安装 Phantom 钱包')
    }

    const resp = await phantom.connect()
    const walletAddress = resp.publicKey.toString()

    const { nonce, message } = await requestBindWalletChallenge(walletAddress)
    const encoded = new TextEncoder().encode(message)
    const { signature } = await phantom.signMessage(encoded, 'utf8')
    const sig58 = encodeBase58(signature)

    await bindWalletToAccount(walletAddress, sig58, nonce)

    walletState.value = {
      connected: true,
      address: walletAddress,
      publicKey: resp.publicKey.toBytes(),
    }

    return walletAddress
  }

  function disconnect() {
    const phantom = (window as Window & { solana?: PhantomProvider }).solana
    phantom?.disconnect()
    walletState.value = { connected: false, address: null, publicKey: null }
    isAuthenticated.value = false
    userEmail.value = null
    authMethod.value = null
    setToken(null)
  }

  return {
    connected,
    address,
    shortAddress,
    displayName,
    isAuthenticated,
    userEmail,
    authMethod,
    connect,
    authenticate,
    loginEmail,
    registerEmailUser,
    loginWithToken,
    bindWallet,
    disconnect,
  }
}

// ── Phantom type ──

interface PhantomProvider {
  isPhantom: boolean
  connect(): Promise<{ publicKey: { toString(): string; toBytes(): Uint8Array } }>
  disconnect(): Promise<void>
  signMessage(message: Uint8Array, encoding: string): Promise<{ signature: Uint8Array }>
}

// ── Base58 encoding (minimal, no dependency) ──

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function encodeBase58(bytes: Uint8Array): string {
  const digits = [0]
  for (const byte of bytes) {
    let carry = byte
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }

  let result = ''
  for (const byte of bytes) {
    if (byte !== 0) break
    result += '1'
  }

  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]]
  }

  return result
}
