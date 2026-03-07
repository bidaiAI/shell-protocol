import type { MinerConfig, TaskExecutionMode } from './config.js'

export interface TaskData {
  id: string
  taskType: 'token_injection' | 'social_engineering' | 'memory_poisoning' | 'full_chain'
  difficulty: number
  targetAgentProfile: {
    id: string
    name: string
    model: string
    systemPrompt: string
    targetChain: string
    availableTools: { name: string, description: string, parameters: Record<string, unknown> }[]
    defenseLevel: string
    injectionSurface: string
  }
  targetChain: string
  injectionSurface: string
  rewardPoints: number
  expiresAt: string | null
  // ── Local Compute extensions ──
  executionMode?: 'sandbox_verified' | 'local_compute'
  challengeNonce?: string
  mockToolDefinitions?: { name: string, description: string, parameters: Record<string, unknown> }[]
}

/** Long-poll the Oracle for the next available task */
export async function pollForTask(
  config: MinerConfig,
  token: string,
  supportedModes: TaskExecutionMode[],
): Promise<TaskData | null> {
  const query = supportedModes.length > 0
    ? `?modes=${encodeURIComponent(supportedModes.join(','))}`
    : ''
  const res = await fetch(`${config.oracleUrl}/tasks/poll${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Token expired, re-authenticate')
    throw new Error(`Poll failed: ${res.statusText}`)
  }

  const data = await res.json() as { task: TaskData | null }
  return data.task
}

/** Ask Oracle to generate a platform-managed payload for an assigned task. */
export async function requestPayloadFromOracle(
  config: MinerConfig,
  token: string,
  taskId: string,
): Promise<{ payload: string; payloadHash?: string; taskType: TaskData['taskType']; rewardPoints: number; source: string }> {
  const res = await fetch(`${config.oracleUrl}/tasks/payload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ taskId }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Payload generation failed (${res.status}): ${errBody || res.statusText}`)
  }

  return res.json() as Promise<{ payload: string; payloadHash?: string; taskType: TaskData['taskType']; rewardPoints: number; source: string }>
}

/** Submit a payload for a task (sandbox_verified path) */
export async function submitPayload(
  config: MinerConfig,
  token: string,
  taskId: string,
  payload: string,
  payloadHash?: string,
): Promise<SubmitResult> {
  const res = await fetch(`${config.oracleUrl}/tasks/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ taskId, payload, ...(payloadHash ? { payloadHash } : {}) }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Submit failed (${res.status}): ${errBody || res.statusText}`)
  }

  return res.json() as Promise<SubmitResult>
}

export interface SubmissionResult {
  submissionId: string
  status: 'pending' | 'verified' | 'infra_error'
  canaryTriggered: boolean
  isValid: boolean
  pointsAwarded: number
  verifiedAt: string | null
  verificationStatus: string | null
  settlementStatus: string | null
  spotCheckSelected: boolean
}

/**
 * Poll Oracle for the final result of a submission.
 * Retries for up to maxWaitMs (default 120s) with exponential backoff.
 * Returns null if timed out or infra_error.
 */
export async function pollSubmissionResult(
  config: MinerConfig,
  token: string,
  submissionId: string,
  maxWaitMs = 120_000,
): Promise<SubmissionResult | null> {
  const deadline = Date.now() + maxWaitMs
  let delay = 3_000 // start at 3 s

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, delay))
    delay = Math.min(delay * 1.5, 15_000) // cap at 15 s

    try {
      const res = await fetch(`${config.oracleUrl}/tasks/result/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) continue

      const data = await res.json() as SubmissionResult

      if (data.status === 'verified' || data.status === 'infra_error') {
        return data
      }
      // status === 'pending' → keep polling
    } catch {
      // Network blip — keep polling
    }
  }

  return null // Timed out
}

/** Submit a local_compute result with structured proof */
export async function submitLocalComputeResult(
  config: MinerConfig,
  token: string,
  body: Record<string, unknown>,
): Promise<SubmitResult> {
  const res = await fetch(`${config.oracleUrl}/tasks/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 409) {
    return {
      result: 'submitted',
      message: 'Duplicate submission — already submitted for this task.',
    }
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Submit failed (${res.status}): ${errBody}`)
  }

  return res.json() as Promise<SubmitResult>
}

export interface SubmitResult {
  result: 'success' | 'submitted' | 'slashed' | 'failed'
  message: string
  pointsAwarded?: number
  submissionId?: string
  slashedAmount?: number
  spotCheckSelected?: boolean
}
