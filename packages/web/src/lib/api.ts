const BASE_URL = import.meta.env.VITE_ORACLE_URL || '/api'

let authToken: string | null = null

export function setToken(token: string | null) {
  authToken = token
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

// ── Email Auth ──

export async function registerEmail(email: string, password: string, referralCode?: string) {
  return request<{ message: string }>('/auth/register-email', {
    method: 'POST',
    body: JSON.stringify({ email, password, referralCode }),
  })
}

export async function verifyEmailToken(token: string) {
  return request<{ token: string; user: UserData }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
}

export async function loginWithEmail(email: string, password: string) {
  return request<{ token: string; user: UserData }>('/auth/login-email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function bindEmailToAccount(email: string, password: string) {
  return request<{ message: string }>('/auth/bind-email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function requestBindWalletChallenge(walletAddress: string) {
  return request<{ nonce: string; message: string }>('/auth/bind-wallet/challenge', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  })
}

export async function bindWalletToAccount(walletAddress: string, signature: string, nonce: string) {
  return request<{ success: boolean; walletAddress: string }>('/auth/bind-wallet', {
    method: 'POST',
    body: JSON.stringify({ walletAddress, signature, nonce }),
  })
}

export interface IssueApiKeyResponse {
  apiKey: string
  user: {
    id: string
    agentName: string | null
    tier: string
    referralCode: string
  }
  warning: string
}

export async function issueApiKey(agentName?: string) {
  return request<IssueApiKeyResponse>('/auth/issue-api-key', {
    method: 'POST',
    body: JSON.stringify({ agentName }),
  })
}

export async function resendVerificationEmail(email: string) {
  return request<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function forgotPasswordRequest(email: string) {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  displayName: string
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
  email?: string
  agentName?: string
  tier: string
  shellPoints: number
  totalSuccessfulAttacks: number
  totalTasksCompleted: number
  referralCode: string
  slashCount: number
  createdAt: string
  successRate: string
  /** Whether this user has been granted mining (whitelist) access */
  miningAccessEnabled?: boolean
  miningAccessGrantedAt?: string | null
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

export type ExecutionMode = 'sandbox_verified' | 'local_compute'
export type SettlementStatus = 'immediate' | 'pending' | 'settled' | 'rejected' | 'timeout_refund' | 'arbitrated_settled' | 'arbitrated_rejected'

export interface Submission {
  id: string
  taskId: string
  canaryTriggered: boolean
  isValid: boolean
  pointsAwarded: number
  verifiedAt: string | null
  submittedAt: string
  executionMode: ExecutionMode
  verificationStatus: string
  settlementStatus: SettlementStatus
  spotCheckSelected: boolean
}

export async function getMySubmissions(limit = 20) {
  return request<{ submissions: Submission[] }>(`/tasks/my-submissions?limit=${limit}`)
}

// ── Submission Result ──

export interface SubmissionResult {
  submissionId: string
  taskId: string
  status: 'pending' | 'verified' | 'infra_error'
  canaryTriggered: boolean
  isValid: boolean
  pointsAwarded: number
  verifiedAt: string | null
  submittedAt: string
  executionMode: ExecutionMode
  verificationStatus: string
  settlementStatus: SettlementStatus
  spotCheckSelected: boolean
}

export async function getSubmissionResult(submissionId: string) {
  return request<SubmissionResult>(`/tasks/result/${submissionId}`)
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

// ── Feed ──

export interface FeedEntry {
  id: string
  displayName: string
  taskType: string
  difficulty: number
  tier: string
  canaryTriggered: boolean
  pointsAwarded: number
  verifiedAt: string
}

export async function getRecentFeed(limit = 20) {
  return request<{ feed: FeedEntry[] }>(`/feed/recent?limit=${limit}`)
}

// ── Disclosures (White Hat Hall of Fame) ──

export interface DisclosureEntry {
  id?: string
  anonymousId: string
  displayName: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  remediationStatus: 'patched' | 'in_progress' | 'unpatched'
  publicSummary: string
  rewardPoints: number
  rewardTier?: string
  confirmedAt: string
  disclosedAt: string
  proofLinks?: string[]
  targetSystem?: string
  attackTypes?: string[]
  isFeatured?: boolean
}

export async function getDisclosures() {
  return request<{ contributions: DisclosureEntry[] }>('/contributions/disclosed')
}

// ── Agent Search ──

export interface AgentSearchResult {
  agentName: string
  tier: string
  shellPoints: number
  totalTasksCompleted: number
  totalSuccessfulAttacks: number
  walletBound: boolean
}

export async function searchAgent(name: string) {
  return request<{ agents: AgentSearchResult[] }>(`/auth/search-agent?name=${encodeURIComponent(name)}`)
}

// ── Referral (new commission system) ──

export interface ReferralOverview {
  referralCode: string
  totalReferrals: number
  pendingCount: number
  activeCount: number
  expiredCount: number
  totalReleased: number
  totalFrozen: number
  todayCommissions: number
}

export interface CommissionEntry {
  id: string
  inviteeDisplay: string
  basePoints: number
  commissionRateBps: number
  commissionPoints: number
  status: 'pending' | 'released' | 'frozen' | 'clawback'
  createdAt: string
  releasedAt: string | null
}

export interface BindingEntry {
  id: string
  inviteeDisplay: string
  status: 'pending' | 'active' | 'expired' | 'revoked'
  activatedAt: string | null
  expiresAt: string | null
  createdAt: string
  totalEarned: number
}

// ── Mining Health (Reputation + Deposit) ──

export interface MiningHealth {
  reputation: {
    totalSubmissions: number
    validSubmissions: number
    invalidSubmissions: number
    fabricationCount: number
    validityRateBps: number
    reputationScore: number
    spotCheckRateBps: number
  }
  deposits: {
    currentlyHeld: number
    heldTotal: number
    forfeited: number
    forfeitedTotal: number
    released: number
    releasedTotal: number
  }
}

export async function getMiningHealth() {
  return request<MiningHealth>('/miners/reputation/me')
}

// ── Referral ──

export async function getReferralOverview() {
  return request<ReferralOverview>('/referral/me')
}

export async function getReferralCommissions(limit = 20, offset = 0) {
  return request<{ commissions: CommissionEntry[] }>(
    `/referral/commissions?limit=${limit}&offset=${offset}`,
  )
}

export async function getReferralBindings() {
  return request<{ bindings: BindingEntry[] }>('/referral/bindings')
}

// ── Admin API (requires ADMIN_SECRET bearer token) ──

export interface AdminUser {
  id: string
  email: string | null
  agentName: string | null
  tier: string
  shellPoints: number
  miningAccessEnabled: boolean
  miningAccessGrantedAt: string | null
  miningAccessNote: string | null
  isBanned: boolean
  isFrozen: boolean
  createdAt: string
  authMethod: string
}

function adminRequest<T>(path: string, secret: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${secret}`,
    ...(options.headers as Record<string, string> || {}),
  }
  return fetch(`${BASE_URL}${path}`, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body.error || res.statusText)
    }
    return res.json() as Promise<T>
  })
}

export async function adminListUsers(
  secret: string,
  opts: { status?: 'enabled' | 'disabled'; q?: string; limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams()
  if (opts.status) params.set('status', opts.status)
  if (opts.q) params.set('q', opts.q)
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.offset) params.set('offset', String(opts.offset))
  return adminRequest<{ users: AdminUser[]; total: number; limit: number; offset: number }>(
    `/admin/mining-access/users?${params}`, secret,
  )
}

export async function adminGrantMining(secret: string, userId: string, note?: string) {
  return adminRequest<{ success: boolean; message: string }>(
    `/admin/mining-access/${userId}/grant`, secret,
    { method: 'POST', body: JSON.stringify({ note }) },
  )
}

export async function adminRevokeMining(secret: string, userId: string, note?: string) {
  return adminRequest<{ success: boolean; message: string }>(
    `/admin/mining-access/${userId}/revoke`, secret,
    { method: 'POST', body: JSON.stringify({ note }) },
  )
}
