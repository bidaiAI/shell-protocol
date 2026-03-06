<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getGlobalStats, getLeaderboard, type GlobalStats, type LeaderboardEntry } from '../lib/api'

const stats = ref<GlobalStats | null>(null)
const topMiners = ref<LeaderboardEntry[]>([])
const loading = ref(true)

// Simulated live feed of recent attacks
const feed = ref<FeedEntry[]>([])

interface FeedEntry {
  id: number
  wallet: string
  action: string
  points: number
  tier: string
  timestamp: Date
}

let feedTimer: ReturnType<typeof setInterval> | null = null
let feedCounter = 0

onMounted(async () => {
  try {
    const [s, lb] = await Promise.all([
      getGlobalStats(),
      getLeaderboard(5),
    ])
    stats.value = s
    topMiners.value = lb.leaderboard
  }
  catch (err) {
    console.error('Failed to load task feed:', err)
  }
  finally {
    loading.value = false
  }

  // Simulate live feed (replace with WebSocket in production)
  startSimulatedFeed()
})

onUnmounted(() => {
  if (feedTimer) clearInterval(feedTimer)
})

const actions = [
  '触发 buy_token 攻击 DeFi Trader',
  '利用 swap_token 攻破 Sniper Bot',
  '社工 send_message 攻击 Assistant',
  '记忆投毒 transfer 攻击 Portfolio Agent',
  '触发 approve_token 攻击 Trading Bot',
  '绕过防御攻击 ElizaOS Agent',
  '注入 bridge_token 攻击跨链 Bot',
]

const tiers = ['scout', 'scout', 'scout', 'hunter', 'hunter', 'apex']

function startSimulatedFeed() {
  feedTimer = setInterval(() => {
    const entry: FeedEntry = {
      id: feedCounter++,
      wallet: randomWallet(),
      action: actions[Math.floor(Math.random() * actions.length)],
      points: Math.floor(Math.random() * 2000) + 100,
      tier: tiers[Math.floor(Math.random() * tiers.length)],
      timestamp: new Date(),
    }
    feed.value.unshift(entry)
    if (feed.value.length > 20) feed.value.pop()
  }, 3000 + Math.random() * 4000)
}

function randomWallet() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let w = ''
  for (let i = 0; i < 44; i++) w += chars[Math.floor(Math.random() * chars.length)]
  return w
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function tierDot(tier: string) {
  switch (tier) {
    case 'apex': return 'bg-tier-apex'
    case 'hunter': return 'bg-tier-hunter'
    default: return 'bg-tier-scout'
  }
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}秒前`
  return `${Math.floor(seconds / 60)}分前`
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">实时任务动态</h1>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-shell-green animate-pulse"></span>
        <span class="text-xs text-shell-text">实时</span>
      </div>
    </div>

    <!-- Live Feed -->
    <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden mb-8">
      <div class="px-4 py-3 border-b border-shell-border text-xs text-shell-text font-semibold uppercase tracking-wider">
        最近攻击
      </div>
      <div class="max-h-[500px] overflow-y-auto">
        <div
          v-for="entry in feed"
          :key="entry.id"
          class="px-4 py-3 border-b border-shell-border/30 flex items-center gap-3 animate-fade-in"
        >
          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(entry.tier)"></span>
          <span class="font-mono text-xs text-shell-text w-20 flex-shrink-0">{{ shortAddr(entry.wallet) }}</span>
          <span class="text-sm flex-1 truncate">{{ entry.action }}</span>
          <span class="text-shell-green font-mono text-sm flex-shrink-0">+{{ entry.points }}</span>
          <span class="text-shell-text text-xs flex-shrink-0 w-14 text-right">{{ timeAgo(entry.timestamp) }}</span>
        </div>
        <div v-if="feed.length === 0" class="px-4 py-8 text-center text-shell-text text-sm">
          等待攻击结果中...<span class="cursor-blink">_</span>
        </div>
      </div>
    </div>

    <!-- Top Miners Sidebar -->
    <div class="grid sm:grid-cols-2 gap-4">
      <div class="bg-shell-card border border-shell-border rounded-lg p-5">
        <h3 class="text-sm font-semibold text-shell-text mb-4 uppercase tracking-wider">矿工排行</h3>
        <div class="space-y-3">
          <div
            v-for="(miner, i) in topMiners"
            :key="miner.walletAddress"
            class="flex items-center gap-3"
          >
            <span class="text-shell-text text-xs w-4">{{ i + 1 }}.</span>
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(miner.tier)"></span>
            <span class="font-mono text-xs flex-1">{{ shortAddr(miner.walletAddress) }}</span>
            <span class="text-shell-green font-mono text-sm">{{ miner.shellPoints.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <div class="bg-shell-card border border-shell-border rounded-lg p-5">
        <h3 class="text-sm font-semibold text-shell-text mb-4 uppercase tracking-wider">全网数据</h3>
        <div v-if="stats" class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-shell-text">活跃矿工</span>
            <span class="font-mono">{{ Number(stats.total_miners).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-shell-text">总攻击数</span>
            <span class="font-mono">{{ Number(stats.total_tasks_completed).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-shell-text">成功攻破</span>
            <span class="font-mono text-tier-apex">{{ Number(stats.total_successful_attacks).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-shell-text">已分配积分</span>
            <span class="font-mono text-shell-green">{{ Number(stats.total_points_distributed).toLocaleString() }}</span>
          </div>
        </div>
        <div v-else class="text-shell-text text-sm">加载中...</div>
      </div>
    </div>
  </div>
</template>
