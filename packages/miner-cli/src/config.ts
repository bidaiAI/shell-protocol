import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type ExecutionMode = 'auto' | 'sandbox_only'
export type TaskExecutionMode = 'sandbox_verified' | 'local_compute'
export type MiningMode = 'free' | 'self_llm'

/** Supported LLM providers (named presets + custom via LLM_BASE_URL) */
export type LLMProvider = 'anthropic' | 'openai' | 'deepseek' | 'gemini' | 'grok' | string

// Environment variables that indicate a user has their own LLM API key
const LLM_KEY_ENV_VARS = ['LLM_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY']

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
  self_llm: { min: 5 * 60 * 1000, max: 10 * 60 * 1000 },    // 5-10 minutes (matches server-side enforcement)
} as const

/** Get a random polling interval for the given mode */
export function getRandomPollInterval(mode: MiningMode): number {
  const range = POLL_INTERVALS[mode]
  return range.min + Math.floor(Math.random() * (range.max - range.min))
}

/** Get human-readable poll interval label */
export function getPollIntervalLabel(mode: MiningMode): string {
  if (mode === 'free') return '20-40 minutes'
  return '5-10 minutes'
}

/**
 * Built-in provider presets: default base URL + model.
 * Any provider not listed here can still be used by setting LLM_BASE_URL + LLM_MODEL.
 * All non-anthropic providers use the OpenAI-compatible chat completions API.
 */
export const PROVIDER_PRESETS: Record<string, { baseUrl?: string; defaultModel: string; sdk: 'anthropic' | 'openai' }> = {
  anthropic: { defaultModel: 'claude-haiku-4-5', sdk: 'anthropic' },
  openai:    { defaultModel: 'gpt-4o-mini', sdk: 'openai' },
  deepseek:  { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', sdk: 'openai' },
  gemini:    { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', defaultModel: 'gemini-2.5-flash', sdk: 'openai' },
  grok:      { baseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-3-mini-fast', sdk: 'openai' },
  moonshot:  { baseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k', sdk: 'openai' },
  bailian:   { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', sdk: 'openai' },
}

export interface MinerConfig {
  oracleUrl: string
  walletPrivateKey: string  // Solana wallet private key (auth method A)
  shellApiKey: string       // sk-shell-xxx API key from dashboard (auth method B)
  llmProvider: LLMProvider
  llmBaseUrl: string        // Custom OpenAI-compatible base URL (optional)
  llmApiKey: string         // Optional — only needed for advanced/local_compute mode
  llmModel: string
  pollingIntervalMs: number
  executionMode: ExecutionMode
  miningMode: MiningMode
}

export function loadConfig(): MinerConfig {
  const provider = (process.env.LLM_PROVIDER || 'anthropic') as LLMProvider
  const preset = PROVIDER_PRESETS[provider]

  // Custom base URL: LLM_BASE_URL > OPENAI_BASE_URL > provider preset > undefined
  const llmBaseUrl = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || preset?.baseUrl || ''

  const llmApiKey = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || ''
  const executionMode = (process.env.EXECUTION_MODE || 'sandbox_only') as ExecutionMode
  const miningMode = inferMiningMode()

  return {
    oracleUrl: process.env.ORACLE_URL || 'https://oracle.openshell.cc',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    shellApiKey: process.env.SHELL_API_KEY || '',
    llmProvider: provider,
    llmBaseUrl,
    llmApiKey,
    llmModel: process.env.LLM_MODEL || preset?.defaultModel || provider,
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

  // Warn if unknown provider without base URL
  if (config.llmApiKey && !PROVIDER_PRESETS[config.llmProvider] && !config.llmBaseUrl) {
    errors.push(
      `Unknown LLM provider "${config.llmProvider}" — set LLM_BASE_URL for custom providers.\n`
      + `  Supported presets: ${Object.keys(PROVIDER_PRESETS).join(', ')}`,
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
