<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getGlobalStats, getLeaderboard, getRecentFeed, type GlobalStats, type LeaderboardEntry, type FeedEntry } from '../lib/api'

const stats = ref<GlobalStats | null>(null)
const topMiners = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const feed = ref<FeedEntry[]>([])
const newEntryIds = ref<Set<string>>(new Set())
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

  // Poll for new feed entries every 8 seconds
  pollTimer = setInterval(async () => {
    try {
      const f = await getRecentFeed(20)
      const existingIds = new Set(feed.value.map(e => e.id))
      const incoming = f.feed.filter(e => !existingIds.has(e.id))
      if (incoming.length > 0) {
        // Mark as new for animation
        incoming.forEach(e => newEntryIds.value.add(e.id))
        feed.value = [...incoming, ...feed.value].slice(0, 40)
        // Clear "new" status after animation
        setTimeout(() => {
          incoming.forEach(e => newEntryIds.value.delete(e.id))
        }, 2000)
      }
    }
    catch {
      // Silently ignore polling errors
    }
  }, 8_000)
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

const taskTypeIcons: Record<string, string> = {
  token_injection: '{ }',
  social_engineering: '> _',
  memory_poisoning: '0x?',
  full_chain: '***',
}

const attackPhases: Record<string, string[]> = {
  token_injection: ['构造恶意 Token', '注入上下文窗口', '劫持输出流'],
  social_engineering: ['伪造可信身份', '建立信任链', '诱导执行指令'],
  memory_poisoning: ['生成投毒数据', '写入长期记忆', '触发记忆回放'],
  full_chain: ['信息搜集', '漏洞利用', '权限提升', '数据外泄'],
}

function tierDot(tier: string) {
  switch (tier) {
    case 'apex': return 'bg-tier-apex'
    case 'hunter': return 'bg-tier-hunter'
    default: return 'bg-tier-scout'
  }
}

function tierColor(tier: string) {
  switch (tier) {
    case 'apex': return 'text-tier-apex'
    case 'hunter': return 'text-tier-hunter'
    default: return 'text-tier-scout'
  }
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
  return `${Math.floor(seconds / 86400)}天前`
}

// Expandable attack detail
const expandedId = ref<string | null>(null)
function toggleDetail(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
    <!-- Header with live indicator -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">攻防实况</h1>
        <p class="text-sm text-shell-text mt-1">实时监控全网 AI Agent 红队测试</p>
      </div>
      <div class="flex items-center gap-2 bg-shell-card border border-shell-green/30 rounded-full px-3 py-1.5">
        <span class="w-2 h-2 rounded-full bg-shell-green animate-pulse"></span>
        <span class="text-xs text-shell-green font-mono">LIVE</span>
      </div>
    </div>

    <!-- Threat Level Bar -->
    <div v-if="stats" class="mb-6 bg-shell-card border border-shell-border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-shell-text uppercase tracking-wider">全网威胁等级</span>
        <span class="text-xs font-mono" :class="
          Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) > 0.4
            ? 'text-tier-apex' : Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) > 0.2
            ? 'text-tier-hunter' : 'text-tier-scout'
        ">
          {{ (Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) * 100).toFixed(1) }}% 攻破率
        </span>
      </div>
      <div class="w-full h-2 bg-black rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-1000"
          :class="
            Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) > 0.4
              ? 'bg-tier-apex' : Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) > 0.2
              ? 'bg-tier-hunter' : 'bg-tier-scout'
          "
          :style="{ width: `${Math.min(Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) * 100, 100)}%` }"
        ></div>
      </div>
      <div class="flex justify-between mt-2 text-xs text-shell-text font-mono">
        <span>{{ Number(stats.total_tasks_completed).toLocaleString() }} 次攻击</span>
        <span class="text-tier-apex">{{ Number(stats.total_successful_attacks).toLocaleString() }} 次攻破</span>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Main Feed (2/3) -->
      <div class="lg:col-span-2">
        <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden scan-line">
          <!-- Terminal Header -->
          <div class="px-4 py-3 border-b border-shell-border flex items-center gap-3">
            <div class="flex gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-tier-apex/60"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-tier-hunter/60"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-shell-green/60"></span>
            </div>
            <span class="text-xs text-shell-text font-mono">shell@oracle:~/attacks$</span>
            <span class="cursor-blink text-shell-green text-xs">_</span>
          </div>

          <!-- Feed Entries -->
          <div class="max-h-[600px] overflow-y-auto">
            <div
              v-for="entry in feed"
              :key="entry.id"
              class="border-b border-shell-border/20 cursor-pointer transition-colors hover:bg-white/[0.02]"
              :class="{
                'animate-slide-in': newEntryIds.has(entry.id),
                'animate-breach': newEntryIds.has(entry.id) && entry.canaryTriggered,
              }"
              @click="toggleDetail(entry.id)"
            >
              <!-- Main Row -->
              <div class="px-4 py-3 flex items-center gap-3">
                <!-- Status indicator -->
                <div class="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-xs font-mono"
                  :class="entry.canaryTriggered
                    ? 'bg-tier-apex/15 text-tier-apex border border-tier-apex/30'
                    : 'bg-shell-border/30 text-shell-text border border-shell-border'
                  ">
                  {{ taskTypeIcons[entry.taskType] || '???' }}
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(entry.tier)"></span>
                    <span class="font-mono text-xs truncate" :class="tierColor(entry.tier)">{{ entry.displayName }}</span>
                    <span class="text-shell-text text-xs hidden sm:inline">{{ taskTypeLabels[entry.taskType] || entry.taskType }}</span>
                  </div>
                </div>

                <!-- Result -->
                <div class="flex items-center gap-3 flex-shrink-0">
                  <span v-if="entry.canaryTriggered"
                    class="text-xs font-bold px-2 py-0.5 rounded bg-tier-apex/15 text-tier-apex border border-tier-apex/30">
                    BREACHED
                  </span>
                  <span v-else class="text-xs text-shell-text px-2 py-0.5 rounded bg-shell-border/30 border border-shell-border">
                    BLOCKED
                  </span>
                  <span v-if="entry.pointsAwarded > 0" class="text-shell-green font-mono text-sm font-bold">+{{ entry.pointsAwarded }}</span>
                  <span v-else class="text-shell-text font-mono text-sm">0</span>
                  <span class="text-shell-text text-xs w-14 text-right hidden sm:inline">{{ timeAgo(entry.verifiedAt) }}</span>
                </div>
              </div>

              <!-- Expandable Attack Detail -->
              <div v-if="expandedId === entry.id" class="px-4 pb-3 animate-fade-in">
                <div class="bg-black/50 rounded-lg p-4 border border-shell-border/50">
                  <div class="text-xs text-shell-text mb-3 font-mono uppercase tracking-wider">攻击链路还原</div>
                  <!-- Attack Phase Timeline -->
                  <div class="space-y-2">
                    <div
                      v-for="(phase, i) in (attackPhases[entry.taskType] || ['载荷生成', '沙盒执行', '结果验证'])"
                      :key="i"
                      class="flex items-center gap-3"
                    >
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0"
                        :class="entry.canaryTriggered || i < (attackPhases[entry.taskType]?.length ?? 3) - 1
                          ? 'bg-shell-green/15 text-shell-green border border-shell-green/30'
                          : 'bg-shell-border/30 text-shell-text border border-shell-border'
                        ">
                        {{ i + 1 }}
                      </div>
                      <div class="flex-1 h-px" :class="entry.canaryTriggered ? 'bg-shell-green/30' : 'bg-shell-border'"></div>
                      <span class="text-xs font-mono"
                        :class="entry.canaryTriggered ? 'text-shell-green' : 'text-shell-text'">
                        {{ phase }}
                      </span>
                      <span class="text-xs" :class="entry.canaryTriggered || i < (attackPhases[entry.taskType]?.length ?? 3) - 1 ? 'text-shell-green' : 'text-tier-apex'">
                        {{ entry.canaryTriggered || i < (attackPhases[entry.taskType]?.length ?? 3) - 1 ? 'PASS' : 'FAIL' }}
                      </span>
                    </div>
                  </div>

                  <!-- Result Summary -->
                  <div class="mt-4 pt-3 border-t border-shell-border/30 flex items-center justify-between text-xs">
                    <div class="font-mono text-shell-text">
                      任务类型: <span class="text-white">{{ taskTypeLabels[entry.taskType] || entry.taskType }}</span>
                    </div>
                    <div v-if="entry.canaryTriggered" class="text-tier-apex font-bold font-mono">
                      VULNERABILITY CONFIRMED
                    </div>
                    <div v-else class="text-shell-green font-mono">
                      DEFENSE HELD
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="feed.length === 0 && !loading" class="px-4 py-12 text-center text-shell-text text-sm">
              <div class="font-mono mb-2">等待矿工提交攻击...</div>
              <span class="cursor-blink text-shell-green">_</span>
            </div>
            <div v-if="loading" class="px-4 py-12 text-center text-shell-text text-sm">
              <span class="font-mono">正在连接攻防网络</span>
              <span class="cursor-blink text-shell-green ml-1">_</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar (1/3) -->
      <div class="space-y-4">
        <!-- Top Miners -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <h3 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">矿工排行</h3>
          <div class="space-y-3">
            <div
              v-for="(miner, i) in topMiners"
              :key="miner.displayName"
              class="flex items-center gap-3"
            >
              <span class="font-mono text-xs w-5" :class="i === 0 ? 'text-tier-apex' : i === 1 ? 'text-tier-hunter' : 'text-shell-text'">
                {{ i === 0 ? '>' : ' ' }}{{ i + 1 }}
              </span>
              <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(miner.tier)"></span>
              <span class="font-mono text-xs flex-1 truncate">{{ miner.displayName }}</span>
              <span class="text-shell-green font-mono text-xs">{{ miner.shellPoints.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Network Stats -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <h3 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">全网数据</h3>
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

        <!-- Attack Type Legend -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <h3 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">攻击类型</h3>
          <div class="space-y-2">
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">{ }</span>
              <span class="text-shell-text">Token 注入 — 劫持模型上下文</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">> _</span>
              <span class="text-shell-text">社会工程 — 诱导执行指令</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">0x?</span>
              <span class="text-shell-text">记忆投毒 — 污染长期记忆</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">***</span>
              <span class="text-shell-text">全链攻击 — 多步骤组合攻击</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
