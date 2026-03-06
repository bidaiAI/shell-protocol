<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getGlobalStats, getLeaderboard, getRecentFeed, type GlobalStats, type LeaderboardEntry, type FeedEntry } from '../lib/api'

const stats = ref<GlobalStats | null>(null)
const topMiners = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const feed = ref<FeedEntry[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const [s, lb, f] = await Promise.all([
      getGlobalStats(),
      getLeaderboard(5),
      getRecentFeed(20),
    ])
    stats.value = s
    topMiners.value = lb.leaderboard
    feed.value = f.feed
  }
  catch (err) {
    console.error('Failed to load task feed:', err)
  }
  finally {
    loading.value = false
  }

  // Poll for new feed entries every 10 seconds
  pollTimer = setInterval(async () => {
    try {
      const f = await getRecentFeed(20)
      // Merge new entries (by id) at the top
      const existingIds = new Set(feed.value.map(e => e.id))
      const newEntries = f.feed.filter(e => !existingIds.has(e.id))
      if (newEntries.length > 0) {
        feed.value = [...newEntries, ...feed.value].slice(0, 30)
      }
    }
    catch {
      // Silently ignore polling errors
    }
  }, 10_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const taskTypeLabels: Record<string, string> = {
  token_injection: 'Token 注入',
  social_engineering: '社会工程',
  memory_poisoning: '记忆投毒',
  full_chain: '全链攻击',
}

function tierDot(tier: string) {
  switch (tier) {
    case 'apex': return 'bg-tier-apex'
    case 'hunter': return 'bg-tier-hunter'
    default: return 'bg-tier-scout'
  }
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
  return `${Math.floor(seconds / 86400)}天前`
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
          <span class="font-mono text-xs text-shell-text w-24 flex-shrink-0 truncate">{{ entry.displayName }}</span>
          <span class="text-sm flex-1 truncate">
            {{ taskTypeLabels[entry.taskType] || entry.taskType }}
            <span v-if="entry.canaryTriggered" class="text-tier-apex ml-1">攻破</span>
            <span v-else class="text-shell-text ml-1">失败</span>
          </span>
          <span v-if="entry.pointsAwarded > 0" class="text-shell-green font-mono text-sm flex-shrink-0">+{{ entry.pointsAwarded }}</span>
          <span v-else class="text-shell-text font-mono text-sm flex-shrink-0">0</span>
          <span class="text-shell-text text-xs flex-shrink-0 w-16 text-right">{{ timeAgo(entry.verifiedAt) }}</span>
        </div>
        <div v-if="feed.length === 0 && !loading" class="px-4 py-8 text-center text-shell-text text-sm">
          暂无验证记录。等待矿工提交攻击...<span class="cursor-blink">_</span>
        </div>
        <div v-if="loading" class="px-4 py-8 text-center text-shell-text text-sm">
          加载中...
        </div>
      </div>
    </div>

    <!-- Top Miners + Stats -->
    <div class="grid sm:grid-cols-2 gap-4">
      <div class="bg-shell-card border border-shell-border rounded-lg p-5">
        <h3 class="text-sm font-semibold text-shell-text mb-4 uppercase tracking-wider">矿工排行</h3>
        <div class="space-y-3">
          <div
            v-for="(miner, i) in topMiners"
            :key="miner.displayName"
            class="flex items-center gap-3"
          >
            <span class="text-shell-text text-xs w-4">{{ i + 1 }}.</span>
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(miner.tier)"></span>
            <span class="font-mono text-xs flex-1 truncate">{{ miner.displayName }}</span>
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
