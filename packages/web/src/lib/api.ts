const BASE_URL = import.meta.env.VITE_ORACLE_URL || '/api'

let authToken: string | null = null

export function setToken(token: string | null) {
  authToken = token
}

export function getToken() {
  return authToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  return res.json()
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Auth ──

export async function requestNonce(walletAddress: string) {
  return request<{ nonce: string; message: string }>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  })
}

export async function login(walletAddress: string, signature: string, nonce: string, referralCode?: string) {
  return request<{ token: string; user: UserData }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ walletAddress, signature, nonce, referralCode }),
  })
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  walletAddress: string
  tier: string
  shellPoints: number
  totalSuccessfulAttacks: number
  totalTasksCompleted: number
}

export async function getLeaderboard(limit = 50, offset = 0) {
  return request<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard?limit=${limit}&offset=${offset}`)
}

// ── User Stats ──

export interface UserData {
  walletAddress: string
  tier: string
  shellPoints: number
  totalSuccessfulAttacks: number
  totalTasksCompleted: number
  referralCode: string
  slashCount: number
  createdAt: string
  successRate: string
}

export async function getMyStats() {
  return request<UserData>('/leaderboard/me')
}

export interface ReferralData {
  referralCode: string
  referredCount: number
  totalReferralEarnings: number
}

export async function getMyReferral() {
  return request<ReferralData>('/leaderboard/me/referral')
}

// ── Submissions ──

export interface Submission {
  id: string
  taskId: string
  canaryTriggered: boolean
  isValid: boolean
  pointsAwarded: number
  verifiedAt: string | null
  submittedAt: string
}

export async function getMySubmissions(limit = 20) {
  return request<{ submissions: Submission[] }>(`/tasks/my-submissions?limit=${limit}`)
}

// ── Global Stats ──

export interface GlobalStats {
  total_miners: number
  total_tasks_completed: number
  total_successful_attacks: number
  total_points_distributed: number
}

export async function getGlobalStats() {
  return request<GlobalStats>('/stats')
}
