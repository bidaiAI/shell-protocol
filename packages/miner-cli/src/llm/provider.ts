import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { MinerConfig } from '../config.js'

export interface LLMResponse {
  text: string
  tokensUsed: { input: number, output: number }
}

/** Unified LLM provider interface */
export async function generatePayload(
  config: MinerConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  switch (config.llmProvider) {
    case 'anthropic':
      return callAnthropic(config, systemPrompt, userPrompt)
    case 'openai':
    case 'deepseek':
      return callOpenAI(config, systemPrompt, userPrompt)
    default:
      throw new Error(`Unsupported LLM provider: ${config.llmProvider}`)
  }
}

async function callAnthropic(
  config: MinerConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const client = new Anthropic({ apiKey: config.llmApiKey, timeout: 60_000 })

  const response = await client.messages.create({
    model: config.llmModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.type === 'text' ? b.text : '')
    .join('\n')

  return {
    text,
    tokensUsed: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  }
}

async function callOpenAI(
  config: MinerConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const client = new OpenAI({
    apiKey: config.llmApiKey,
    timeout: 60_000,
    baseURL: config.llmProvider === 'deepseek'
      ? 'https://api.deepseek.com'
      : undefined,
  })

  const response = await client.chat.completions.create({
    model: config.llmModel,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  return {
    text: response.choices[0]?.message?.content ?? '',
    tokensUsed: {
      input: response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
  }
}
