import type { MinerConfig } from './config.js'

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
}

/** Long-poll the Oracle for the next available task */
export async function pollForTask(
  config: MinerConfig,
  token: string,
): Promise<TaskData | null> {
  const res = await fetch(`${config.oracleUrl}/tasks/poll`, {
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

/** Submit a payload for a task */
export async function submitPayload(
  config: MinerConfig,
  token: string,
  taskId: string,
  payload: string,
): Promise<{
  result: 'success' | 'submitted' | 'slashed'
  message: string
  pointsAwarded?: number
  submissionId?: string
  slashedAmount?: number
}> {
  const res = await fetch(`${config.oracleUrl}/tasks/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ taskId, payload }),
  })

  if (!res.ok) {
    throw new Error(`Submit failed: ${res.statusText}`)
  }

  return res.json() as Promise<{
    result: 'success' | 'submitted' | 'slashed'
    message: string
    pointsAwarded?: number
    submissionId?: string
    slashedAmount?: number
  }>
}
