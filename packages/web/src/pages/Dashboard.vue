<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWallet } from '../lib/wallet'
import {
  getMyStats, getMySubmissions, getReferralOverview, getReferralCommissions, getReferralBindings,
  getMiningHealth, issueApiKey,
  type UserData, type Submission, type ReferralOverview, type CommissionEntry, type BindingEntry,
  type MiningHealth,
} from '../lib/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isAuthenticated, address, displayName, userEmail, authMethod, bindWallet } = useWallet()

const user = ref<UserData | null>(null)
const referralOverview = ref<ReferralOverview | null>(null)
const commissions = ref<CommissionEntry[]>([])
const bindings = ref<BindingEntry[]>([])
const submissions = ref<Submission[]>([])
const miningHealth = ref<MiningHealth | null>(null)
const loading = ref(true)
const showCommissions = ref(false)
const showBindings = ref(false)
const bindWalletError = ref('')
const bindWalletSuccess = ref(false)
const agentNameInput = ref('')
const issuingApiKey = ref(false)
const issuedApiKey = ref('')
const apiKeyError = ref('')
const apiKeySuccess = ref('')

onMounted(async () => {
  if (!isAuthenticated.value) {
    router.push('/')
    return
  }
  await loadDashboard()
})

async function loadDashboard() {
  loading.value = true
  try {
    const [stats, refData, subs, health] = await Promise.all([
      getMyStats(),
      getReferralOverview(),
      getMySubmissions(10),
      getMiningHealth().catch(() => null),
    ])
    user.value = stats
    agentNameInput.value = stats.agentName || ''
    referralOverview.value = refData
    submissions.value = subs.submissions
    miningHealth.value = health
  }
  catch (err) {
    console.error('Failed to load dashboard:', err)
  }
  finally {
    loading.value = false
  }
}

async function handleBindWallet() {
  bindWalletError.value = ''
  bindWalletSuccess.value = false
  try {
    await bindWallet()
    bindWalletSuccess.value = true
    await loadDashboard()
  }
  catch (err) {
    bindWalletError.value = err instanceof Error ? err.message : '绑定失败'
    setTimeout(() => { bindWalletError.value = '' }, 5000)
  }
}

async function handleIssueApiKey() {
  issuingApiKey.value = true
  apiKeyError.value = ''
  apiKeySuccess.value = ''
  issuedApiKey.value = ''
  try {
    const result = await issueApiKey(agentNameInput.value.trim() || undefined)
    issuedApiKey.value = result.apiKey
    apiKeySuccess.value = result.warning
    if (user.value) {
      user.value = {
        ...user.value,
        agentName: result.user.agentName || user.value.agentName,
      }
    }
    if (result.user.agentName) {
      agentNameInput.value = result.user.agentName
    }
  }
  catch (err) {
    apiKeyError.value = err instanceof Error ? err.message : '生成密钥失败'
  }
  finally {
    issuingApiKey.value = false
  }
}

function tierColor(tier: string) {
  switch (tier) {
    case 'apex': return 'text-tier-apex'
    case 'hunter': return 'text-tier-hunter'
    default: return 'text-tier-scout'
  }
}

function tierDot(tier: string) {
  switch (tier) {
    case 'apex': return 'bg-tier-apex'
    case 'hunter': return 'bg-tier-hunter'
    default: return 'bg-tier-scout'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function spotCheckRateText(bps: number) {
  return `${(bps / 100).toFixed(0)}%`
}

function executionModeLabel(mode: string) {
  return mode === 'local_compute' ? '本地执行' : '沙盒验证'
}

function settlementLabel(status: string) {
  const map: Record<string, string> = {
    immediate: '即时', pending: '待结算', settled: '已结算',
    rejected: '拒绝', timeout_refund: '退款',
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

const referralLink = ref('')
function copyReferral() {
  if (!referralOverview.value) return
  const link = `${window.location.origin}/?ref=${referralOverview.value.referralCode}`
  navigator.clipboard.writeText(link)
  referralLink.value = '已复制!'
  setTimeout(() => { referralLink.value = '' }, 2000)
}

async function toggleCommissions() {
  showCommissions.value = !showCommissions.value
  if (showCommissions.value && commissions.value.length === 0) {
    try {
      const data = await getReferralCommissions(20)
      commissions.value = data.commissions
    }
    catch (err) {
      console.error('Failed to load commissions:', err)
    }
  }
}

function commissionStatusText(status: string) {
  switch (status) {
    case 'released': return '已发放'
    case 'frozen': return '冻结中'
    case 'pending': return '待发放'
    case 'clawback': return '已追缴'
    default: return status
  }
}

async function toggleBindings() {
  showBindings.value = !showBindings.value
  if (showBindings.value && bindings.value.length === 0) {
    try {
      const data = await getReferralBindings()
      bindings.value = data.bindings
    }
    catch (err) {
      console.error('Failed to load bindings:', err)
    }
  }
}

function bindingStatusText(status: string) {
  switch (status) {
    case 'pending': return '待激活'
    case 'active': return '活跃'
    case 'expired': return '已过期'
    case 'revoked': return '已撤销'
    default: return status
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
    <h1 class="text-3xl font-bold mb-6">控制面板</h1>

    <div v-if="loading" class="text-center text-shell-text py-12">加载中...</div>

    <template v-else-if="user">
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div class="bg-shell-card border border-shell-border rounded-lg p-4">
          <div class="text-xs text-shell-text mb-1">积分余额</div>
          <div class="text-2xl font-bold text-shell-green font-mono">{{ user.shellPoints.toLocaleString() }}</div>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-4">
          <div class="text-xs text-shell-text mb-1">段位</div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" :class="tierDot(user.tier)"></span>
            <span class="text-xl font-bold capitalize" :class="tierColor(user.tier)">{{ user.tier }}</span>
          </div>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-4">
          <div class="text-xs text-shell-text mb-1">成功率</div>
          <div class="text-2xl font-bold text-white">{{ user.successRate }}</div>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-4">
          <div class="text-xs text-shell-text mb-1">攻击统计</div>
          <div class="text-lg font-bold text-white">
            <span class="text-tier-apex">{{ user.totalSuccessfulAttacks }}</span>
            <span class="text-shell-text text-sm"> / {{ user.totalTasksCompleted }}</span>
          </div>
        </div>
      </div>

      <!-- Mining Health Panel -->
      <div v-if="miningHealth" class="bg-shell-card border border-shell-border rounded-lg p-5 mb-8">
        <h2 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">挖矿健康度</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div class="text-xs text-shell-text mb-1">信誉分数</div>
            <div class="text-xl font-bold font-mono" :class="miningHealth.reputation.reputationScore >= 500 ? 'text-shell-green' : miningHealth.reputation.reputationScore >= 200 ? 'text-yellow-400' : 'text-red-400'">
              {{ miningHealth.reputation.reputationScore }}
              <span class="text-xs text-shell-text font-normal">/ 1000</span>
            </div>
          </div>
          <div>
            <div class="text-xs text-shell-text mb-1">抽检率</div>
            <div class="text-xl font-bold font-mono text-white">
              {{ spotCheckRateText(miningHealth.reputation.spotCheckRateBps) }}
            </div>
          </div>
          <div>
            <div class="text-xs text-shell-text mb-1">提交有效率</div>
            <div class="text-xl font-bold font-mono" :class="miningHealth.reputation.validityRateBps >= 6000 ? 'text-shell-green' : 'text-yellow-400'">
              {{ (miningHealth.reputation.validityRateBps / 100).toFixed(1) }}%
            </div>
          </div>
          <div>
            <div class="text-xs text-shell-text mb-1">保证金</div>
            <div class="text-lg font-bold font-mono text-white">
              <span v-if="miningHealth.deposits.currentlyHeld > 0" class="text-yellow-400">
                {{ miningHealth.deposits.heldTotal }} 冻结中
              </span>
              <span v-else class="text-shell-green">无冻结</span>
            </div>
          </div>
        </div>

        <!-- Reputation Progress Bar -->
        <div class="mt-4">
          <div class="flex justify-between text-xs text-shell-text mb-1">
            <span>{{ miningHealth.reputation.validSubmissions }} 有效 / {{ miningHealth.reputation.totalSubmissions }} 总提交</span>
            <span v-if="miningHealth.reputation.fabricationCount > 0" class="text-red-400">
              ⚠ {{ miningHealth.reputation.fabricationCount }} 次造假记录
            </span>
          </div>
          <div class="w-full h-1.5 bg-black rounded-full overflow-hidden">
            <div
              class="h-full rounded-full bg-shell-green transition-all"
              :style="{ width: `${Math.min(miningHealth.reputation.validityRateBps / 100, 100)}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Wallet & Referral -->
      <div class="grid sm:grid-cols-2 gap-4 mb-8">
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <div class="text-xs text-shell-text mb-2">账号</div>
          <div v-if="userEmail" class="text-sm text-white mb-1">{{ userEmail }}</div>
          <div v-if="address" class="font-mono text-sm text-white break-all">{{ address }}</div>
          <div v-if="!address" class="mt-2">
            <div class="text-xs text-yellow-400 mb-2">绑定 Solana 钱包以参与未来 $SHELL 代币兑换</div>
            <button
              class="bg-shell-green text-black px-3 py-1 text-xs font-semibold rounded hover:bg-shell-green-dim transition-colors"
              @click="handleBindWallet"
            >
              绑定钱包
            </button>
            <span v-if="bindWalletError" class="text-red-400 text-xs ml-2">{{ bindWalletError }}</span>
            <span v-if="bindWalletSuccess" class="text-shell-green text-xs ml-2">绑定成功</span>
          </div>
          <div class="text-xs text-shell-text mt-2">
            注册时间 {{ user.createdAt ? formatDate(user.createdAt) : '—' }}
          </div>
        </div>

        <!-- Referral Dashboard -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <div class="text-xs text-shell-text mb-3">推荐计划</div>
          <div v-if="referralOverview" class="space-y-3">
            <!-- Referral Code & Copy -->
            <div class="flex items-center gap-2">
              <code class="bg-black px-2 py-1 rounded text-shell-green text-sm flex-1">{{ referralOverview.referralCode }}</code>
              <button
                class="text-xs text-shell-text hover:text-shell-green transition-colors"
                @click="copyReferral"
              >
                {{ referralLink || '复制链接' }}
              </button>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-shell-text">已推荐</span>
                <span class="text-white ml-1 font-bold">{{ referralOverview.totalReferrals }} 人</span>
              </div>
              <div>
                <span class="text-shell-text">活跃中</span>
                <span class="text-shell-green ml-1 font-bold">{{ referralOverview.activeCount }} 人</span>
              </div>
              <div>
                <span class="text-shell-text">总收益</span>
                <span class="text-shell-green ml-1 font-bold">{{ referralOverview.totalReleased.toLocaleString() }} 分</span>
              </div>
              <div>
                <span class="text-shell-text">今日佣金</span>
                <span class="text-white ml-1 font-bold">{{ referralOverview.todayCommissions.toLocaleString() }} 分</span>
              </div>
            </div>

            <!-- Frozen warning -->
            <div v-if="referralOverview.totalFrozen > 0"
              class="text-xs text-yellow-400 bg-yellow-400/10 rounded px-3 py-2">
              冻结中: {{ referralOverview.totalFrozen.toLocaleString() }} 分（风控审核中）
            </div>

            <!-- Commission Details Toggle -->
            <button
              class="text-xs text-shell-text hover:text-shell-green transition-colors"
              @click="toggleCommissions"
            >
              {{ showCommissions ? '收起佣金明细' : '查看佣金明细' }}
            </button>

            <!-- Commission List -->
            <div v-if="showCommissions" class="space-y-1">
              <div v-if="commissions.length === 0" class="text-xs text-shell-text">暂无佣金记录</div>
              <div v-for="c in commissions" :key="c.id"
                class="flex justify-between items-center text-xs border-t border-shell-border/50 pt-1.5">
                <div>
                  <span class="text-white">{{ c.inviteeDisplay }}</span>
                  <span class="text-shell-text ml-2">{{ formatDate(c.createdAt) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="{
                    'text-shell-green': c.status === 'released',
                    'text-yellow-400': c.status === 'frozen',
                    'text-shell-text': c.status === 'pending',
                    'text-red-400': c.status === 'clawback',
                  }">
                    +{{ c.commissionPoints }}
                  </span>
                  <span class="text-shell-text">({{ c.commissionRateBps / 100 }}%)</span>
                </div>
              </div>
            </div>

            <!-- Bindings Toggle -->
            <button
              class="text-xs text-shell-text hover:text-shell-green transition-colors"
              @click="toggleBindings"
            >
              {{ showBindings ? '收起推荐列表' : '查看推荐列表' }}
            </button>

            <!-- Bindings List -->
            <div v-if="showBindings" class="space-y-1">
              <div v-if="bindings.length === 0" class="text-xs text-shell-text">暂无推荐记录</div>
              <div v-for="b in bindings" :key="b.id"
                class="flex justify-between items-center text-xs border-t border-shell-border/50 pt-1.5">
                <div>
                  <span class="text-white">{{ b.inviteeDisplay }}</span>
                  <span class="text-shell-text ml-2">{{ formatDate(b.createdAt) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="{
                    'text-shell-green': b.status === 'active',
                    'text-shell-text': b.status === 'pending',
                    'text-tier-scout': b.status === 'expired',
                    'text-red-400': b.status === 'revoked',
                  }">
                    {{ bindingStatusText(b.status) }}
                  </span>
                  <span v-if="b.totalEarned > 0" class="text-shell-green">+{{ b.totalEarned.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Key Issuance -->
      <div class="bg-shell-card border border-shell-border rounded-lg p-5 mb-8">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 class="text-sm font-semibold text-white">Agent 密钥</h2>
            <p class="text-xs text-shell-text mt-1">为当前账号绑定一个 `sk-shell-*` 密钥，用于 CLI 挖矿。</p>
          </div>
          <span v-if="user.agentName" class="text-xs font-mono text-shell-green bg-black rounded px-2 py-1">
            {{ user.agentName }}
          </span>
        </div>

        <div class="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label class="block">
            <span class="text-xs text-shell-text block mb-1">Agent 名称</span>
            <input
              v-model="agentNameInput"
              type="text"
              maxlength="64"
              :disabled="!!issuedApiKey"
              placeholder="例如 shell_hunter"
              class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-shell-green/50"
            />
          </label>
          <button
            class="bg-shell-green text-black px-4 py-2.5 text-sm font-semibold rounded hover:bg-shell-green-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="issuingApiKey || !!issuedApiKey"
            @click="handleIssueApiKey"
          >
            {{ issuingApiKey ? '生成中...' : issuedApiKey ? '已生成' : '生成密钥' }}
          </button>
        </div>

        <p class="text-xs text-shell-text mt-3">
          该操作目前仅支持首次签发；如需轮换，请等待后续管理功能。
        </p>

        <div v-if="issuedApiKey" class="mt-4 rounded border border-shell-green/30 bg-shell-green/10 p-4">
          <div class="text-xs text-shell-green mb-2">请立即保存，页面刷新后不会再次显示</div>
          <code class="block bg-black rounded px-3 py-2 text-sm font-mono text-shell-green break-all">{{ issuedApiKey }}</code>
        </div>

        <div v-if="apiKeySuccess" class="mt-3 text-xs text-shell-green">{{ apiKeySuccess }}</div>
        <div v-if="apiKeyError" class="mt-3 text-xs text-red-400">{{ apiKeyError }}</div>
      </div>

      <!-- Recent Submissions -->
      <div>
        <h2 class="text-lg font-bold mb-4">最近提交</h2>
        <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden">
          <table class="w-full text-sm" v-if="submissions.length > 0">
            <thead>
              <tr class="border-b border-shell-border text-shell-text text-left">
                <th class="px-4 py-3">状态</th>
                <th class="px-4 py-3 hidden sm:table-cell">模式</th>
                <th class="px-4 py-3 hidden sm:table-cell">结算</th>
                <th class="px-4 py-3 text-right">积分</th>
                <th class="px-4 py-3 text-right">时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sub in submissions"
                :key="sub.id"
                class="border-b border-shell-border/50"
              >
                <td class="px-4 py-3">
                  <span
                    v-if="sub.isValid"
                    class="text-shell-green"
                  >
                    攻击成功
                  </span>
                  <span
                    v-else-if="sub.verifiedAt"
                    class="text-tier-scout"
                  >
                    失败
                  </span>
                  <span v-else class="text-tier-hunter">
                    验证中...
                  </span>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell">
                  <span class="text-xs font-mono" :class="sub.executionMode === 'local_compute' ? 'text-blue-400' : 'text-shell-text'">
                    {{ executionModeLabel(sub.executionMode) }}
                  </span>
                  <span v-if="sub.spotCheckSelected" class="text-yellow-400 text-xs ml-1">⚡</span>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell">
                  <span class="text-xs" :class="settlementColor(sub.settlementStatus)">
                    {{ settlementLabel(sub.settlementStatus) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-mono" :class="sub.pointsAwarded > 0 ? 'text-shell-green' : 'text-shell-text'">
                  {{ sub.pointsAwarded > 0 ? `+${sub.pointsAwarded}` : '0' }}
                </td>
                <td class="px-4 py-3 text-right text-shell-text text-xs">
                  {{ formatDate(sub.submittedAt) }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-4 py-8 text-center text-shell-text">
            暂无提交记录。开始挖矿后结果会显示在这里。
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-center text-shell-text py-12">
      请登录以查看控制面板。
    </div>
  </div>
</template>
