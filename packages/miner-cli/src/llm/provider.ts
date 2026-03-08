import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { MinerConfig } from '../config.js'
import { PROVIDER_PRESETS } from '../config.js'

export interface LLMResponse {
  text: string
  tokensUsed: { input: number, output: number }
}

/**
 * Unified LLM provider interface.
 *
 * Routing logic:
 *  - provider === 'anthropic' → Anthropic SDK (Messages API)
 *  - Everything else → OpenAI SDK (Chat Completions API)
 *    Includes built-in presets (openai, deepseek, gemini, grok) and
 *    any custom provider via LLM_BASE_URL.
 */
export async function generatePayload(
  config: MinerConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const preset = PROVIDER_PRESETS[config.llmProvider]
  const sdk = preset?.sdk ?? 'openai' // unknown providers default to OpenAI-compatible

  if (sdk === 'anthropic') {
    return callAnthropic(config, systemPrompt, userPrompt)
  }
  return callOpenAI(config, systemPrompt, userPrompt)
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
  // Resolve base URL: explicit config > provider preset > OpenAI default
  const baseURL = config.llmBaseUrl || PROVIDER_PRESETS[config.llmProvider]?.baseUrl || undefined

  const client = new OpenAI({
    apiKey: config.llmApiKey,
    timeout: 60_000,
    baseURL,
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
