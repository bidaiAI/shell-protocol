/**
 * Execution Proof Module
 *
 * Computes execution hash and builds the structured submission body
 * for local_compute mode. Hash algorithm matches server-side
 * (proof-validator.ts:computeExecutionHash).
 */

import { createHash } from 'node:crypto'
import type { LocalExecutionResult } from './executor.js'

export interface ActionLogEntry {
  name: string
  arguments: Record<string, unknown>
  order: number
}

/**
 * Compute SHA-256 execution hash matching the server-side algorithm.
 * canonical = JSON.stringify({ payload, actionLog: sorted by order, agentResponseHash })
 */
export function computeExecutionHash(
  payload: string,
  actionLog: ActionLogEntry[],
  agentResponse: string,
): string {
  const sortedLog = [...actionLog].sort((a, b) => a.order - b.order)
  const agentResponseHash = createHash('sha256').update(agentResponse).digest('hex')

  const canonical = JSON.stringify({
    payload,
    actionLog: sortedLog.map(a => ({ name: a.name, arguments: a.arguments, order: a.order })),
    agentResponseHash,
  })

  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Build the full submission body for local_compute tasks.
 */
export function buildSubmissionBody(
  taskId: string,
  payload: string,
  challengeNonce: string,
  executionResult: LocalExecutionResult,
  config: { llmProvider: string, llmModel: string },
): Record<string, unknown> {
  // Sanitize BEFORE hashing to match server-side sanitizeSubmissionData()
  // Strip control characters (keep \n and \t) — must match server-side exactly
  const stripControl = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  // Redact sensitive patterns — must match server-side SENSITIVE_PATTERNS exactly
  const SENSITIVE_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/g,       // OpenAI-style API keys
    /AKIA[0-9A-Z]{16}/g,          // AWS access keys
    /ghp_[a-zA-Z0-9]{36}/g,       // GitHub personal access tokens
    /xox[bpors]-[a-zA-Z0-9-]+/g,  // Slack tokens
  ]
  const redact = (s: string) => {
    let result = s
    for (const pattern of SENSITIVE_PATTERNS) result = result.replace(pattern, '[REDACTED]')
    return result
  }

  let sanitizedResponse = redact(stripControl(executionResult.agentResponse.slice(0, 5000)))
  let sanitizedPayload = redact(stripControl(payload.slice(0, 10000)))
  let sanitizedLog = executionResult.actionLog.slice(0, 50).map(entry => {
    const argsStr = JSON.stringify(entry.arguments ?? {})
    const args = argsStr.length > 2048
      ? { _truncated: true, _preview: argsStr.slice(0, 200) }
      : JSON.parse(redact(JSON.stringify(entry.arguments)))
    return { name: entry.name, arguments: args, order: entry.order }
  })

  const executionHash = computeExecutionHash(
    sanitizedPayload,
    sanitizedLog,
    sanitizedResponse,
  )

  const totalTokens = executionResult.tokensUsed.input + executionResult.tokensUsed.output

  // Estimate cost (rough per-token pricing)
  let estimatedCostUsd = totalTokens * 0.000003 // Default Haiku-level pricing
  if (config.llmModel.includes('sonnet')) {
    estimatedCostUsd = totalTokens * 0.000015
  } else if (config.llmModel.includes('gpt-4o-mini')) {
    estimatedCostUsd = totalTokens * 0.000001
  } else if (config.llmModel.includes('deepseek')) {
    estimatedCostUsd = totalTokens * 0.000002
  }

  return {
    taskId,
    payload: sanitizedPayload,
    executionMode: 'local_compute',
    result: {
      actionLog: sanitizedLog,
      agentResponse: sanitizedResponse,
      modelUsed: executionResult.modelUsed,
      tokensUsed: executionResult.tokensUsed,
      executionTimeMs: executionResult.executionTimeMs,
      rounds: executionResult.rounds,
    },
    proof: {
      executionHash,
      challengeNonce,
    },
    costMetrics: {
      totalTokens,
      estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
      provider: config.llmProvider,
      model: config.llmModel,
    },
  }
}
