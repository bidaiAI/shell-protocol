import 'dotenv/config'

export type ExecutionMode = 'auto' | 'local_only' | 'sandbox_only'
export type TaskExecutionMode = 'sandbox_verified' | 'local_compute'

export interface MinerConfig {
  oracleUrl: string
  walletPrivateKey: string  // Solana wallet private key (auth method A)
  shellApiKey: string       // sk-shell-xxx API key from dashboard (auth method B)
  llmProvider: 'anthropic' | 'openai' | 'deepseek'
  llmApiKey: string         // Optional — only needed for advanced/local_compute mode
  llmModel: string
  pollingIntervalMs: number
  executionMode: ExecutionMode
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

  return {
    oracleUrl: process.env.ORACLE_URL || 'https://oracle.openshell.cc',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    shellApiKey: process.env.SHELL_API_KEY || '',
    llmProvider: provider,
    llmApiKey,
    llmModel: process.env.LLM_MODEL || defaultModels[provider],
    pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS) || 5000,
    executionMode,
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

  if (config.executionMode === 'local_only' && !config.llmApiKey) {
    errors.push(
      'EXECUTION_MODE=local_only requires LLM_API_KEY.\n'
      + '  Without a local model key, the miner can only run platform-managed sandbox tasks.',
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
  const modes: TaskExecutionMode[] = []

  if (config.executionMode !== 'local_only') {
    modes.push('sandbox_verified')
  }
  if (config.executionMode !== 'sandbox_only' && !!config.llmApiKey) {
    modes.push('local_compute')
  }

  return modes.length > 0 ? modes : ['sandbox_verified']
}
