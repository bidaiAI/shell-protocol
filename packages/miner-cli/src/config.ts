import 'dotenv/config'

export interface MinerConfig {
  oracleUrl: string
  walletPrivateKey: string
  llmProvider: 'anthropic' | 'openai' | 'deepseek'
  llmApiKey: string
  llmModel: string
  pollingIntervalMs: number
}

export function loadConfig(): MinerConfig {
  const provider = (process.env.LLM_PROVIDER || 'anthropic') as MinerConfig['llmProvider']

  const defaultModels: Record<string, string> = {
    anthropic: 'claude-sonnet-4-6-20260320',
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
  }

  return {
    oracleUrl: process.env.ORACLE_URL || 'http://localhost:3100',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    llmProvider: provider,
    llmApiKey: process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    llmModel: process.env.LLM_MODEL || defaultModels[provider],
    pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS) || 5000,
  }
}

export function validateConfig(config: MinerConfig): string[] {
  const errors: string[] = []
  if (!config.walletPrivateKey) errors.push('WALLET_PRIVATE_KEY is required')
  if (!config.llmApiKey) errors.push('LLM_API_KEY (or ANTHROPIC_API_KEY) is required')
  if (!config.oracleUrl) errors.push('ORACLE_URL is required')
  return errors
}
