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
  const executionHash = computeExecutionHash(
    payload,
    executionResult.actionLog,
    executionResult.agentResponse,
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
    payload,
    executionMode: 'local_compute',
    result: {
      actionLog: executionResult.actionLog,
      agentResponse: executionResult.agentResponse.slice(0, 5000),
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
