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
  const sanitizedResponse = executionResult.agentResponse.slice(0, 5000)
  const sanitizedPayload = payload.slice(0, 10000)
  const sanitizedLog = executionResult.actionLog.slice(0, 50).map(entry => {
    const argsStr = JSON.stringify(entry.arguments ?? {})
    const args = argsStr.length > 2048
      ? { _truncated: true, _preview: argsStr.slice(0, 200) }
      : entry.arguments
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
