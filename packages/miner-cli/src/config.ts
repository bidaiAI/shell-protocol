import 'dotenv/config'

export type ExecutionMode = 'auto' | 'local_only' | 'sandbox_only'

export interface MinerConfig {
  oracleUrl: string
  walletPrivateKey: string  // Solana wallet private key (auth method A)
  shellApiKey: string       // sk-shell-xxx API key from dashboard (auth method B)
  llmProvider: 'anthropic' | 'openai' | 'deepseek'
  llmApiKey: string
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

  return {
    oracleUrl: process.env.ORACLE_URL || 'https://oracle.openshell.cc',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    shellApiKey: process.env.SHELL_API_KEY || '',
    llmProvider: provider,
    llmApiKey: process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    llmModel: process.env.LLM_MODEL || defaultModels[provider],
    pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS) || 5000,
    executionMode: (process.env.EXECUTION_MODE || 'auto') as ExecutionMode,
  }
}

export function validateConfig(config: MinerConfig): string[] {
  const errors: string[] = []

  // Need EITHER wallet private key OR shell API key for authentication
  if (!config.walletPrivateKey && !config.shellApiKey) {
    errors.push(
      'Authentication required — set ONE of:\n'
      + '  WALLET_PRIVATE_KEY  Solana wallet private key (base58)\n'
      + '  SHELL_API_KEY       sk-shell-xxx key from https://openshell.cc/dashboard',
    )
  }

  if (!config.llmApiKey) {
    errors.push(
      'LLM_API_KEY is required — get one from:\n'
      + '  Anthropic:  console.anthropic.com  (recommended: claude-haiku-4-5)\n'
      + '  OpenAI:     platform.openai.com    (recommended: gpt-4o-mini)\n'
      + '  DeepSeek:   platform.deepseek.com  (cheapest: deepseek-chat)',
    )
  }

  if (!config.oracleUrl) {
    errors.push('ORACLE_URL is required (default: https://oracle.openshell.cc)')
  }

  return errors
}

/** Returns true if config is completely unconfigured (first run) */
export function isFirstRun(config: MinerConfig): boolean {
  return !config.walletPrivateKey && !config.shellApiKey && !config.llmApiKey
}
