<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWallet } from '../lib/wallet'
import {
  getMyStats, getMySubmissions, getReferralOverview, getReferralCommissions, getReferralBindings,
  type UserData, type Submission, type ReferralOverview, type CommissionEntry, type BindingEntry,
} from '../lib/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isAuthenticated, address } = useWallet()

const user = ref<UserData | null>(null)
const referralOverview = ref<ReferralOverview | null>(null)
const commissions = ref<CommissionEntry[]>([])
const bindings = ref<BindingEntry[]>([])
const submissions = ref<Submission[]>([])
const loading = ref(true)
const showCommissions = ref(false)
const showBindings = ref(false)

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
    const [stats, refData, subs] = await Promise.all([
      getMyStats(),
      getReferralOverview(),
      getMySubmissions(10),
    ])
    user.value = stats
    referralOverview.value = refData
    submissions.value = subs.submissions
  }
  catch (err) {
    console.error('Failed to load dashboard:', err)
  }
  finally {
    loading.value = false
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

      <!-- Wallet & Referral -->
      <div class="grid sm:grid-cols-2 gap-4 mb-8">
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <div class="text-xs text-shell-text mb-2">钱包</div>
          <div class="font-mono text-sm text-white break-all">{{ address }}</div>
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

      <!-- Recent Submissions -->
      <div>
        <h2 class="text-lg font-bold mb-4">最近提交</h2>
        <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden">
          <table class="w-full text-sm" v-if="submissions.length > 0">
            <thead>
              <tr class="border-b border-shell-border text-shell-text text-left">
                <th class="px-4 py-3">状态</th>
                <th class="px-4 py-3 hidden sm:table-cell">任务</th>
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
                <td class="px-4 py-3 font-mono text-xs text-shell-text hidden sm:table-cell">
                  {{ sub.taskId.slice(0, 8) }}
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
      请连接钱包以查看控制面板。
    </div>
  </div>
</template>
