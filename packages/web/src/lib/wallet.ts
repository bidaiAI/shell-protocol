import { ref, computed } from 'vue'
import { requestNonce, login, setToken, getToken } from './api'

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

export function useWallet() {
  const connected = computed(() => walletState.value.connected)
  const address = computed(() => walletState.value.address)
  const shortAddress = computed(() => {
    const addr = walletState.value.address
    if (!addr) return ''
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
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

    // Auto-authenticate after connecting
    await authenticate()
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

  function disconnect() {
    const phantom = (window as Window & { solana?: PhantomProvider }).solana
    phantom?.disconnect()
    walletState.value = { connected: false, address: null, publicKey: null }
    isAuthenticated.value = false
    setToken(null)
  }

  return {
    connected,
    address,
    shortAddress,
    isAuthenticated,
    connect,
    authenticate,
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
