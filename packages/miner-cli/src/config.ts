import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type ExecutionMode = 'auto' | 'sandbox_only'
export type TaskExecutionMode = 'sandbox_verified' | 'local_compute'
export type MiningMode = 'free' | 'self_llm'

// Environment variables that indicate a user has their own LLM API key
const LLM_KEY_ENV_VARS = ['LLM_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY']

/** Auto-infer mining mode based on whether user has an LLM API key */
export function inferMiningMode(): MiningMode {
  for (const key of LLM_KEY_ENV_VARS) {
    if (process.env[key]) return 'self_llm'
  }
  return 'free'
}

/** Polling interval ranges by mining mode (in milliseconds) */
const POLL_INTERVALS = {
  free: { min: 20 * 60 * 1000, max: 40 * 60 * 1000 },       // 20-40 minutes
  self_llm: { min: 60 * 1000, max: 120 * 1000 },              // 60-120 seconds
} as const

/** Get a random polling interval for the given mode */
export function getRandomPollInterval(mode: MiningMode): number {
  const range = POLL_INTERVALS[mode]
  return range.min + Math.floor(Math.random() * (range.max - range.min))
}

/** Get human-readable poll interval label */
export function getPollIntervalLabel(mode: MiningMode): string {
  if (mode === 'free') return '20-40 minutes'
  return '60-120 seconds'
}

export interface MinerConfig {
  oracleUrl: string
  walletPrivateKey: string  // Solana wallet private key (auth method A)
  shellApiKey: string       // sk-shell-xxx API key from dashboard (auth method B)
  llmProvider: 'anthropic' | 'openai' | 'deepseek'
  llmApiKey: string         // Optional — only needed for advanced/local_compute mode
  llmModel: string
  pollingIntervalMs: number
  executionMode: ExecutionMode
  miningMode: MiningMode
}

export function loadConfig(): MinerConfig {
  const provider = (process.env.LLM_PROVIDER || 'anthropic') as MinerConfig['llmProvider']

  const defaultModels: Record<string, string> = {
    anthropic: 'claude-haiku-4-5',
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
  }

  const llmApiKey = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || ''
  const executionMode = (process.env.EXECUTION_MODE || 'sandbox_only') as ExecutionMode
  const miningMode = inferMiningMode()

  return {
    oracleUrl: process.env.ORACLE_URL || 'https://oracle-production-252f.up.railway.app',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    shellApiKey: process.env.SHELL_API_KEY || '',
    llmProvider: provider,
    llmApiKey,
    llmModel: process.env.LLM_MODEL || defaultModels[provider],
    pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS) || getRandomPollInterval(miningMode),
    executionMode,
    miningMode,
  }
}

export function validateConfig(config: MinerConfig): string[] {
  const errors: string[] = []

  if (!config.walletPrivateKey && !config.shellApiKey) {
    errors.push(
      'Authentication required — set ONE of:\n'
      + '  SHELL_API_KEY       sk-shell-xxx key from https://openshell.cc/dashboard\n'
      + '  WALLET_PRIVATE_KEY  Solana wallet private key (base58)',
    )
  }

  if (!config.oracleUrl) {
    errors.push('ORACLE_URL is required (default: https://oracle.openshell.cc)')
  }

  try {
    const url = new URL(config.oracleUrl)
    const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !isLocalHttp) {
      errors.push('ORACLE_URL must use https:// in non-local environments')
    }
  } catch {
    errors.push('ORACLE_URL must be a valid URL')
  }

  if (config.executionMode === 'auto' && !config.llmApiKey) {
    errors.push(
      'EXECUTION_MODE=auto requires LLM_API_KEY.\n'
      + '  Without a local model key, use EXECUTION_MODE=sandbox_only.',
    )
  }

  return errors
}

/** Returns true if config is completely unconfigured (first run) */
export function isFirstRun(config: MinerConfig): boolean {
  return !config.walletPrivateKey && !config.shellApiKey
}

/** Returns true if running without a local LLM (Oracle handles payload generation) */
export function isPlatformManaged(config: MinerConfig): boolean {
  return !config.llmApiKey
}

/** Task execution modes this miner can safely accept from Oracle. */
export function getSupportedTaskModes(config: MinerConfig): TaskExecutionMode[] {
  const modes: TaskExecutionMode[] = ['sandbox_verified']

  if (config.executionMode === 'auto' && !!config.llmApiKey) {
    modes.push('local_compute')
  }

  return modes
}

// ── Device Fingerprint ────────────────────────────────────────────────────────

const FINGERPRINT_FILE = '.shell-device-id'

/** Get or create a persistent device fingerprint (UUID). */
export function getDeviceFingerprint(): string {
  const fp = resolve(process.cwd(), FINGERPRINT_FILE)

  if (existsSync(fp)) {
    const stored = readFileSync(fp, 'utf-8').trim()
    if (stored) return stored
  }

  const id = randomUUID()
  writeFileSync(fp, id, 'utf-8')
  return id
}
