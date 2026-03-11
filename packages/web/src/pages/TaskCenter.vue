<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getMySubmissions, getSubmissionResult, setToken, getRedTeamAgents, type Submission, type SubmissionResult, type RedTeamAgent } from '../lib/api'
import { useWallet } from '../lib/wallet'
import { useLang } from '../lib/i18n'

const { isAuthenticated } = useWallet()
const { lang } = useLang()

const T = computed(() => lang.value === 'en' ? {
  title: 'Task Center',
  authHint: 'Connect your wallet or enter your $SHELL API key to view submission history.',
  authHint2: 'Your $SHELL key (sk-shell-xxx) is generated when you register a miner. It is NOT a third-party API key.',
  keyLogin: '$SHELL Key Login',
  loginBtn: 'Login',
  submissionHistory: 'Submission History',
  loading: 'Loading...',
  noSubmissions: 'No submissions yet. Start the miner to begin mining!',
  colTime: 'Submitted', colStatus: 'Status', colMode: 'Mode',
  colSettlement: 'Settlement', colPoints: 'Points', colAction: 'Action',
  details: 'Details',
  detailTitle: 'Submission Details',
  verifyStatus: 'Verification Status', execMode: 'Execution Mode',
  settlement: 'Settlement', canary: 'Canary Triggered',
  spotCheck: 'Spot Check', pointsAwarded: 'Points Awarded',
  submittedAt: 'Submitted At', verifiedAt: 'Verified At',
  close: 'Close',
  statusSuccess: 'Attack Success', statusFail: 'Attack Failed',
  statusVerified: 'Verified', statusPending: 'Verifying...',
  localExec: '⚡ LLM Mode', sandboxExec: '🆓 Free Mode',
  yes: 'Yes', no: 'No',
  agentDirectory: 'Attack Target Directory',
  agentDirectoryDesc: 'All 44 AI Agent profiles in the sandbox — choose your target',
  breaches: 'breaches',
  models: 'Models',
  surface: 'Surface',
  defense: 'Defense',
  promoted: 'PUBLIC',
  noBreaches: 'Not yet breached',
} : {
  title: '任务中心',
  authHint: '连接钱包或输入你的 $SHELL 密钥查看提交记录。',
  authHint2: '$SHELL 密钥（sk-shell-xxx）在注册矿机时自动生成，非第三方 API Key。',
  keyLogin: '$SHELL 密钥登录',
  loginBtn: '登录',
  submissionHistory: '提交历史',
  loading: '加载中...',
  noSubmissions: '暂无提交记录。运行矿机开始挖矿吧！',
  colTime: '提交时间', colStatus: '状态', colMode: '模式',
  colSettlement: '结算', colPoints: '积分', colAction: '操作',
  details: '详情',
  detailTitle: '提交详情',
  verifyStatus: '验证状态', execMode: '执行模式',
  settlement: '结算状态', canary: 'Canary 触发',
  spotCheck: '是否被抽检', pointsAwarded: '获得积分',
  submittedAt: '提交时间', verifiedAt: '验证时间',
  close: '关闭',
  statusSuccess: '攻击成功', statusFail: '攻击失败',
  statusVerified: '已验证', statusPending: '验证中...',
  localExec: '⚡ LLM 模式', sandboxExec: '🆓 免费模式',
  yes: '是', no: '否',
  agentDirectory: '攻击目标一览',
  agentDirectoryDesc: '沙盒中全部 44 个 AI Agent 档案 — 选择你的目标',
  breaches: '次攻破',
  models: '模型',
  surface: '注入面',
  defense: '防御',
  promoted: '已公开',
  noBreaches: '尚未被攻破',
})

// API Key auth for non-wallet users
const apiKeyInput = ref('')
const apiKeyAuthed = ref(false)
const apiKeyError = ref('')

const authed = computed(() => isAuthenticated.value || apiKeyAuthed.value)

const submissions = ref<Submission[]>([])
const loading = ref(true)
const selectedResult = ref<SubmissionResult | null>(null)
const loadingResult = ref(false)
const agents = ref<RedTeamAgent[]>([])

onMounted(async () => {
  // Load agent directory (public, no auth required)
  try {
    const data = await getRedTeamAgents()
    // Show unbreached agents first, then sort by breach count desc
    agents.value = [...data.agents].sort((a, b) => {
      if (a.breachCount === 0 && b.breachCount > 0) return -1
      if (a.breachCount > 0 && b.breachCount === 0) return 1
      return b.breachCount - a.breachCount
    })
  } catch { /* non-critical */ }

  if (!authed.value) {
    loading.value = false
    return
  }
  await loadSubmissions()
})

async function loadSubmissions() {
  loading.value = true
  try {
    const data = await getMySubmissions(50)
    submissions.value = data.submissions
  }
  catch (err) {
    console.error('Failed to load submissions:', err)
  }
  finally {
    loading.value = false
  }
}

const THIRD_PARTY_PREFIXES: [string, string][] = [
  ['sk-ant-', 'Anthropic'], ['sk-proj-', 'OpenAI'], ['sk-or-', 'OpenRouter'],
  ['gsk_', 'Groq'], ['xai-', 'xAI'], ['AIzaSy', 'Google'],
]

async function loginWithApiKey() {
  apiKeyError.value = ''
  const key = apiKeyInput.value.trim()

  for (const [prefix, provider] of THIRD_PARTY_PREFIXES) {
    if (key.startsWith(prefix)) {
      apiKeyError.value = lang.value === 'en'
        ? `This is a ${provider} key — do not enter it here! $SHELL keys start with sk-shell-.`
        : `这是 ${provider} 的密钥，请勿在此输入！$SHELL 密钥以 sk-shell- 开头。`
      apiKeyInput.value = ''
      return
    }
  }

  if (!key.startsWith('sk-shell-')) {
    apiKeyError.value = lang.value === 'en'
      ? 'Invalid format — $SHELL keys start with sk-shell-'
      : '格式错误 — $SHELL 密钥以 sk-shell- 开头，请检查是否粘贴正确'
    return
  }
  setToken(key)
  try {
    await loadSubmissions()
    apiKeyAuthed.value = true
  }
  catch {
    apiKeyError.value = lang.value === 'en' ? 'Invalid or expired API Key' : 'API Key 无效或已过期'
    setToken(null)
  }
}

async function viewResult(submissionId: string) {
  loadingResult.value = true
  selectedResult.value = null
  try {
    selectedResult.value = await getSubmissionResult(submissionId)
  }
  catch (err) {
    console.error('Failed to load result:', err)
  }
  finally {
    loadingResult.value = false
  }
}

function statusLabel(sub: Submission) {
  if (sub.verifiedAt && sub.isValid && sub.canaryTriggered) return { text: T.value.statusSuccess, class: 'text-shell-green' }
  if (sub.verifiedAt && !sub.isValid) return { text: T.value.statusFail, class: 'text-red-400' }
  if (sub.verifiedAt) return { text: T.value.statusVerified, class: 'text-shell-text' }
  return { text: T.value.statusPending, class: 'text-yellow-400' }
}

function resultStatusLabel(status: string) {
  if (lang.value === 'en') {
    switch (status) {
      case 'verified': return 'Verified'
      case 'infra_error': return 'Infra Error (will retry)'
      case 'pending': return 'Pending...'
      default: return status
    }
  }
  switch (status) {
    case 'verified': return '已验证'
    case 'infra_error': return '基础设施错误（将重试）'
    case 'pending': return '验证中...'
    default: return status
  }
}

function executionModeLabel(mode: string) {
  return mode === 'local_compute' ? T.value.localExec : T.value.sandboxExec
}

function settlementLabel(status: string) {
  if (lang.value === 'en') {
    const map: Record<string, string> = {
      immediate: 'Immediate', pending: 'Pending', settled: 'Settled',
      rejected: 'Rejected', timeout_refund: 'Timeout Refund',
      arbitrated_settled: 'Arbitrated (Pass)', arbitrated_rejected: 'Arbitrated (Fail)',
    }
    return map[status] || status
  }
  const map: Record<string, string> = {
    immediate: '即时结算', pending: '待结算', settled: '已结算',
    rejected: '已拒绝', timeout_refund: '超时退款',
    arbitrated_settled: '仲裁通过', arbitrated_rejected: '仲裁拒绝',
  }
  return map[status] || status
}

function settlementColor(status: string) {
  switch (status) {
    case 'settled': case 'immediate': case 'arbitrated_settled': return 'text-shell-green'
    case 'pending': return 'text-yellow-400'
    case 'rejected': case 'arbitrated_rejected': return 'text-red-400'
    case 'timeout_refund': return 'text-blue-400'
    default: return 'text-shell-text'
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString(lang.value === 'en' ? 'en-US' : 'zh-CN')
}

const defenseLevelCls: Record<string, string> = {
  none:     'text-red-400 border-red-400/30',
  basic:    'text-yellow-400 border-yellow-400/30',
  moderate: 'text-orange-400 border-orange-400/30',
  advanced: 'text-purple-400 border-purple-400/30',
}
const defenseLevelText: Record<string, { en: string; zh: string }> = {
  none:     { en: 'None', zh: '无防御' },
  basic:    { en: 'Basic', zh: '基础' },
  moderate: { en: 'Moderate', zh: '中等' },
  advanced: { en: 'Advanced', zh: '高级' },
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
    <h1 class="text-3xl font-bold mb-6">{{ T.title }}</h1>

    <!-- Not authenticated -->
    <div v-if="!authed" class="bg-shell-card border border-shell-border rounded-lg p-8">
      <p class="text-shell-text mb-4 text-center">{{ T.authHint }}</p>
      <p class="text-shell-text/60 mb-6 text-center text-xs">{{ T.authHint2 }}</p>
      <div class="max-w-sm mx-auto">
        <div class="text-xs text-shell-text mb-2 uppercase tracking-wider">{{ T.keyLogin }}</div>
        <div class="flex gap-2">
          <input
            v-model="apiKeyInput"
            type="password"
            placeholder="sk-shell-..."
            class="flex-1 bg-black border border-shell-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-shell-green/50"
            @keyup.enter="loginWithApiKey"
          />
          <button
            class="bg-shell-green text-black px-4 py-2 text-sm font-semibold rounded hover:bg-shell-green-dim transition-colors"
            @click="loginWithApiKey"
          >
            {{ T.loginBtn }}
          </button>
        </div>
        <p v-if="apiKeyError" class="text-red-400 text-xs mt-2">{{ apiKeyError }}</p>
      </div>
    </div>

    <!-- Submission list -->
    <div v-else>
      <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden mb-6">
        <div class="px-4 py-3 border-b border-shell-border text-xs text-shell-text font-semibold uppercase tracking-wider">
          {{ T.submissionHistory }}
        </div>
        <div v-if="loading" class="px-4 py-8 text-center text-shell-text">{{ T.loading }}</div>
        <div v-else-if="submissions.length === 0" class="px-4 py-8 text-center text-shell-text text-sm">
          {{ T.noSubmissions }}
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-shell-border text-shell-text text-left text-xs">
              <th class="px-4 py-2">{{ T.colTime }}</th>
              <th class="px-4 py-2">{{ T.colStatus }}</th>
              <th class="px-4 py-2 hidden sm:table-cell">{{ T.colMode }}</th>
              <th class="px-4 py-2 hidden sm:table-cell">{{ T.colSettlement }}</th>
              <th class="px-4 py-2 text-right">{{ T.colPoints }}</th>
              <th class="px-4 py-2 text-right">{{ T.colAction }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="sub in submissions"
              :key="sub.id"
              class="border-b border-shell-border/30 hover:bg-shell-border/20 transition-colors"
            >
              <td class="px-4 py-2.5 text-xs text-shell-text">{{ formatDate(sub.submittedAt) }}</td>
              <td class="px-4 py-2.5">
                <span :class="statusLabel(sub).class" class="text-xs font-medium">
                  {{ statusLabel(sub).text }}
                </span>
              </td>
              <td class="px-4 py-2.5 hidden sm:table-cell">
                <span class="text-xs font-mono" :class="sub.executionMode === 'local_compute' ? 'text-blue-400 font-semibold' : 'text-shell-text/60'">
                  {{ executionModeLabel(sub.executionMode) }}
                </span>
                <span v-if="sub.spotCheckSelected" class="text-yellow-400 text-xs ml-1" title="Spot checked">🔍</span>
              </td>
              <td class="px-4 py-2.5 hidden sm:table-cell">
                <span class="text-xs" :class="settlementColor(sub.settlementStatus)">
                  {{ settlementLabel(sub.settlementStatus) }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right font-mono">
                <span v-if="sub.pointsAwarded > 0" class="text-shell-green">+{{ sub.pointsAwarded }}</span>
                <span v-else class="text-shell-text">0</span>
              </td>
              <td class="px-4 py-2.5 text-right">
                <button class="text-xs text-shell-green hover:underline" @click="viewResult(sub.id)">
                  {{ T.details }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Result detail panel -->
      <div v-if="loadingResult" class="bg-shell-card border border-shell-border rounded-lg p-6 text-center text-shell-text">
        {{ T.loading }}
      </div>
      <div v-else-if="selectedResult" class="bg-shell-card border border-shell-border rounded-lg p-6">
        <h3 class="text-sm font-semibold mb-4 uppercase tracking-wider text-shell-text">{{ T.detailTitle }}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span class="text-shell-text">{{ T.verifyStatus }}</span>
            <p class="font-medium">{{ resultStatusLabel(selectedResult.status) }}</p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.execMode }}</span>
            <p :class="selectedResult.executionMode === 'local_compute' ? 'text-blue-400 font-semibold' : 'text-shell-text/70'" class="font-mono">
              {{ executionModeLabel(selectedResult.executionMode) }}
            </p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.settlement }}</span>
            <p :class="settlementColor(selectedResult.settlementStatus)">
              {{ settlementLabel(selectedResult.settlementStatus) }}
            </p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.canary }}</span>
            <p :class="selectedResult.canaryTriggered ? 'text-shell-green' : 'text-red-400'">
              {{ selectedResult.canaryTriggered ? T.yes : T.no }}
            </p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.spotCheck }}</span>
            <p :class="selectedResult.spotCheckSelected ? 'text-yellow-400' : 'text-shell-text'">
              {{ selectedResult.spotCheckSelected ? `${T.yes} ⚡` : T.no }}
            </p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.pointsAwarded }}</span>
            <p class="font-mono text-shell-green">{{ selectedResult.pointsAwarded }}</p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.submittedAt }}</span>
            <p class="text-xs">{{ formatDate(selectedResult.submittedAt) }}</p>
          </div>
          <div>
            <span class="text-shell-text">{{ T.verifiedAt }}</span>
            <p class="text-xs">{{ formatDate(selectedResult.verifiedAt) }}</p>
          </div>
        </div>
        <button class="mt-4 text-xs text-shell-text hover:text-white transition-colors" @click="selectedResult = null">
          {{ T.close }}
        </button>
      </div>
    </div>

    <!-- ── Agent Target Directory ── -->
    <div v-if="agents.length > 0" class="mt-10">
      <div class="mb-4">
        <h2 class="text-lg font-bold font-mono text-white flex items-center gap-2">
          <span class="text-red-400">&#9679;</span> {{ T.agentDirectory }}
        </h2>
        <p class="text-xs text-shell-text/50 mt-1">{{ T.agentDirectoryDesc }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="agent in agents" :key="agent.agentName"
          class="bg-shell-card border rounded-xl p-4 transition-colors hover:border-red-400/30"
          :class="agent.isPromoted ? 'border-red-400/40' : 'border-shell-border'"
        >
          <!-- Header row -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="font-mono font-semibold text-sm text-white leading-tight">
              {{ agent.agentDisplayName || agent.agentName }}
            </span>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span v-if="agent.isPromoted"
                class="text-xs px-1.5 py-0.5 rounded border border-red-400/40 text-red-400 bg-red-400/10 font-mono">
                {{ T.promoted }}
              </span>
              <span v-if="agent.defenseLevel"
                :class="['text-xs px-1.5 py-0.5 rounded border font-mono', defenseLevelCls[agent.defenseLevel] || 'text-shell-text/50 border-shell-border']">
                {{ defenseLevelText[agent.defenseLevel]?.[lang] || agent.defenseLevel }}
              </span>
            </div>
          </div>

          <!-- Summary -->
          <p v-if="agent.summary" class="text-xs text-shell-text/50 mb-2 leading-relaxed line-clamp-2">
            {{ agent.summary }}
          </p>

          <!-- Meta row -->
          <div class="flex items-center gap-3 text-xs text-shell-text/40 font-mono mb-2">
            <span>{{ T.surface }}: {{ agent.injectionSurface }}</span>
            <span v-if="agent.breachCount > 0" class="text-red-400/70">
              {{ agent.breachCount }} {{ T.breaches }}
            </span>
            <span v-else class="text-shell-text/25">{{ T.noBreaches }}</span>
          </div>

          <!-- Models used -->
          <div v-if="agent.modelsUsed && agent.modelsUsed.length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="m in agent.modelsUsed.slice(0, 3)" :key="m"
              class="text-xs bg-black/40 border border-shell-border text-shell-text/40 px-1.5 py-0.5 rounded font-mono"
            >{{ m }}</span>
            <span v-if="agent.modelsUsed.length > 3"
              class="text-xs text-shell-text/25 font-mono">+{{ agent.modelsUsed.length - 3 }}</span>
          </div>

          <!-- Triggered actions (if any) -->
          <div v-if="agent.latestTriggeredActions && agent.latestTriggeredActions.length > 0"
            class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="action in agent.latestTriggeredActions.slice(0, 3)" :key="action"
              class="text-xs bg-red-400/10 text-red-300/60 px-1.5 py-0.5 rounded font-mono border border-red-400/15"
            >{{ action.replace(/_/g, ' ') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
