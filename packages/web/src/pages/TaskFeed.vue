<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { getGlobalStats, getLeaderboard, getRecentFeed, getAgentProfiles, type GlobalStats, type LeaderboardEntry, type FeedEntry, type AgentProfile } from '../lib/api'
import { useLang } from '../lib/i18n'

const { lang } = useLang()

const stats = ref<GlobalStats | null>(null)
const topMiners = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const feed = ref<FeedEntry[]>([])
const newEntryIds = ref<Set<string>>(new Set())
const feedFilter = ref<'all' | 'success' | 'rewarded'>('rewarded')
const hasMore = ref(true)
const loadingMore = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

// Agent profiles
const agentProfiles = ref<AgentProfile[]>([])
const agentDifficulty = ref<{ easy: number; medium: number; hard: number }>({ easy: 0, medium: 0, hard: 0 })
const agentFilterLevel = ref<'all' | 'none' | 'basic' | 'advanced'>('all')
const filteredAgents = computed(() => {
  if (agentFilterLevel.value === 'all') return agentProfiles.value
  return agentProfiles.value.filter(p => p.defenseLevel === agentFilterLevel.value)
})

const T = computed(() => lang.value === 'en' ? {
  title: 'Attack Feed',
  subtitle: 'Live monitoring of AI Agent red-team attacks across the network',
  threatLevel: 'Network Threat Level',
  breachRate: 'breach rate',
  attacks: 'attacks',
  breached: 'breached',
  topMiners: 'Top Miners',
  networkStats: 'Network Stats',
  activeMiners: 'Active Miners',
  totalAttacks: 'Total Attacks',
  successful: 'Successful',
  pointsDist: 'Points Distributed',
  attackTypes: 'Attack Types',
  tokenInjDesc: 'Token Injection — hijack model context',
  seDesc: 'Social Engineering — trick into executing commands',
  mpDesc: 'Memory Poisoning — corrupt long-term memory',
  fcDesc: 'Full Chain — multi-step combined attack',
  waiting: 'Waiting for miners to submit attacks...',
  connecting: 'Connecting to attack network',
  attackChain: 'Attack Chain Reconstruction',
  taskType: 'Task Type',
  loadingStats: 'Loading...',
  // Detail panel
  targetAgent: 'Target Agent',
  model: 'Model',
  chain: 'Chain',
  defense: 'Defense',
  surface: 'Attack Surface',
  canaryOps: 'Canary Operations',
  execMode: 'Execution',
  vulnReport: 'Vulnerability Report',
  defenseNone: 'No Defense',
  defenseBasic: 'Basic',
  defenseModerate: 'Moderate',
  defenseHardened: 'Hardened',
  surfaceToken: 'Token Data',
  surfaceChat: 'Chat Interface',
  surfaceTool: 'Tool Description',
  surfaceMemory: 'Memory Context',
  localExec: 'Local Compute',
  sandboxExec: 'Sandbox',
  filterAll: 'All',
  filterSuccess: 'Breached Only',
  filterRewarded: 'Rewarded Only',
  loadMore: 'Load More',
  loadingMore: 'Loading...',
  noMore: 'All loaded',
  reasonDuplicate: 'Same method — no pts',
  reasonDefenseHeld: 'Defense held',
  reasonDiminished: 'Diminished returns',
  // Agent showcase
  agentShowcaseTitle: 'Target Agents',
  agentShowcaseSubtitle: 'All simulated AI agents available for red-team testing',
  agentFilterAll: 'All',
  agentFilterEasy: 'Easy',
  agentFilterMedium: 'Medium',
  agentFilterHard: 'Hard',
  agentTools: 'Tools',
  agentCanary: 'Canary',
  agentDefNone: 'No Defense',
  agentDefBasic: 'Basic',
  agentDefAdvanced: 'Advanced',
  agentSurfToken: 'Token Data',
  agentSurfChat: 'Chat',
  agentSurfSocial: 'Social',
  agentSurfEmail: 'Email',
} : {
  title: '攻防实况',
  subtitle: '实时监控全网 AI Agent 红队测试',
  threatLevel: '全网威胁等级',
  breachRate: '攻破率',
  attacks: '次攻击',
  breached: '次攻破',
  topMiners: '矿工排行',
  networkStats: '全网数据',
  activeMiners: '活跃矿工',
  totalAttacks: '总攻击数',
  successful: '成功攻破',
  pointsDist: '已分配积分',
  attackTypes: '攻击类型',
  tokenInjDesc: 'Token 注入 — 劫持模型上下文',
  seDesc: '社会工程 — 诱导执行指令',
  mpDesc: '记忆投毒 — 污染长期记忆',
  fcDesc: '全链攻击 — 多步骤组合攻击',
  waiting: '等待矿工提交攻击...',
  connecting: '正在连接攻防网络',
  attackChain: '攻击链路还原',
  taskType: '任务类型',
  loadingStats: '加载中...',
  // Detail panel
  targetAgent: '目标 Agent',
  model: '模型',
  chain: '链',
  defense: '防御等级',
  surface: '攻击面',
  canaryOps: 'Canary 操作',
  execMode: '执行方式',
  vulnReport: '漏洞报告',
  defenseNone: '无防御',
  defenseBasic: '基础防御',
  defenseModerate: '中等防御',
  defenseHardened: '高级防御',
  surfaceToken: 'Token 数据',
  surfaceChat: '对话接口',
  surfaceTool: '工具描述',
  surfaceMemory: '记忆上下文',
  localExec: '本地执行',
  sandboxExec: '沙盒验证',
  filterAll: '全部',
  filterSuccess: '仅成功',
  filterRewarded: '仅计分',
  loadMore: '加载更多',
  loadingMore: '加载中...',
  noMore: '已全部加载',
  reasonDuplicate: '相同手段 — 不计分',
  reasonDefenseHeld: '防御成功',
  reasonDiminished: '递减奖励',
  // Agent showcase
  agentShowcaseTitle: '模拟 Agent 目标',
  agentShowcaseSubtitle: '可供红队测试的全部 AI Agent 模拟对象',
  agentFilterAll: '全部',
  agentFilterEasy: '简单',
  agentFilterMedium: '中等',
  agentFilterHard: '困难',
  agentTools: '工具',
  agentCanary: 'Canary',
  agentDefNone: '无防御',
  agentDefBasic: '基础',
  agentDefAdvanced: '高级',
  agentSurfToken: 'Token 数据',
  agentSurfChat: '对话',
  agentSurfSocial: '社交',
  agentSurfEmail: '邮件',
})

const taskTypeLabels = computed<Record<string, string>>(() => lang.value === 'en' ? {
  token_injection: 'Token Injection',
  social_engineering: 'Social Engineering',
  memory_poisoning: 'Memory Poisoning',
  full_chain: 'Full Chain',
} : {
  token_injection: 'Token 注入',
  social_engineering: '社会工程',
  memory_poisoning: '记忆投毒',
  full_chain: '全链攻击',
})

const taskTypeIcons: Record<string, string> = {
  token_injection: '{ }',
  social_engineering: '> _',
  memory_poisoning: '0x?',
  full_chain: '***',
}

const attackPhases = computed<Record<string, string[]>>(() => lang.value === 'en' ? {
  token_injection: ['Craft malicious token', 'Inject into context window', 'Hijack output stream'],
  social_engineering: ['Forge trusted identity', 'Build trust chain', 'Induce command execution'],
  memory_poisoning: ['Generate poisoned data', 'Write to long-term memory', 'Trigger memory replay'],
  full_chain: ['Reconnaissance', 'Exploitation', 'Privilege escalation', 'Data exfiltration'],
} : {
  token_injection: ['构造恶意 Token', '注入上下文窗口', '劫持输出流'],
  social_engineering: ['伪造可信身份', '建立信任链', '诱导执行指令'],
  memory_poisoning: ['生成投毒数据', '写入长期记忆', '触发记忆回放'],
  full_chain: ['信息搜集', '漏洞利用', '权限提升', '数据外泄'],
})

const PAGE_SIZE = 20

async function fetchFeed(reset = false) {
  const breached = feedFilter.value === 'success'
  const rewarded = feedFilter.value === 'rewarded'
  const offset = reset ? 0 : feed.value.length
  if (!reset) loadingMore.value = true
  try {
    const f = await getRecentFeed(PAGE_SIZE, offset, breached, rewarded)
    if (reset) {
      feed.value = f.feed
    } else {
      feed.value = [...feed.value, ...f.feed]
    }
    hasMore.value = f.hasMore
  } catch (err) {
    console.error('Failed to load feed:', err)
  } finally {
    loadingMore.value = false
  }
}

// When filter changes, re-fetch from scratch
watch(feedFilter, () => {
  feed.value = []
  hasMore.value = true
  fetchFeed(true)
})

onMounted(async () => {
  try {
    const [s, lb, ap] = await Promise.all([
      getGlobalStats(),
      getLeaderboard(5),
      getAgentProfiles().catch(() => null),
    ])
    stats.value = s
    topMiners.value = lb.leaderboard
    if (ap) {
      agentProfiles.value = ap.profiles
      agentDifficulty.value = ap.byDifficulty
    }
    await fetchFeed(true)
  }
  catch (err) {
    console.error('Failed to load task feed:', err)
  }
  finally {
    loading.value = false
  }

  // Poll for new feed entries every 8 seconds (only for "all" view)
  pollTimer = setInterval(async () => {
    if (feedFilter.value !== 'all') return
    try {
      const f = await getRecentFeed(PAGE_SIZE, 0, false)
      const existingIds = new Set(feed.value.map(e => e.id))
      const incoming = f.feed.filter(e => !existingIds.has(e.id))
      if (incoming.length > 0) {
        incoming.forEach(e => newEntryIds.value.add(e.id))
        feed.value = [...incoming, ...feed.value]
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
  if (lang.value === 'en') {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
  if (seconds < 60) return `${seconds}秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
  return `${Math.floor(seconds / 86400)}天前`
}

function defenseLevelLabel(level: string) {
  return ({
    none: T.value.defenseNone,
    basic: T.value.defenseBasic,
    moderate: T.value.defenseModerate,
    hardened: T.value.defenseHardened,
  } as Record<string, string>)[level] || level
}

function defenseLevelColor(level: string) {
  switch (level) {
    case 'none': return 'text-red-400'
    case 'basic': return 'text-yellow-400'
    case 'moderate': return 'text-blue-400'
    case 'hardened': return 'text-shell-green'
    default: return 'text-shell-text'
  }
}

function surfaceLabel(surface: string) {
  return ({
    token_data: T.value.surfaceToken,
    chat_interface: T.value.surfaceChat,
    tool_description: T.value.surfaceTool,
    memory_context: T.value.surfaceMemory,
  } as Record<string, string>)[surface] || surface
}

function chainLabel(chain: string) {
  return ({
    solana: 'Solana',
    bsc: 'BNB Chain',
    ethereum: 'Ethereum',
    multi: 'Multi-chain',
  } as Record<string, string>)[chain] || chain
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
        <h1 class="text-3xl font-bold">{{ T.title }}</h1>
        <p class="text-sm text-shell-text mt-1">{{ T.subtitle }}</p>
      </div>
      <div class="flex items-center gap-2 bg-shell-card border border-shell-green/30 rounded-full px-3 py-1.5">
        <span class="w-2 h-2 rounded-full bg-shell-green animate-pulse"></span>
        <span class="text-xs text-shell-green font-mono">LIVE</span>
      </div>
    </div>

    <!-- Threat Level Bar -->
    <div v-if="stats" class="mb-6 bg-shell-card border border-shell-border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-shell-text uppercase tracking-wider">{{ T.threatLevel }}</span>
        <span class="text-xs font-mono" :class="
          Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) > 0.4
            ? 'text-tier-apex' : Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) > 0.2
            ? 'text-tier-hunter' : 'text-tier-scout'
        ">
          {{ (Number(stats.total_successful_attacks) / Math.max(Number(stats.total_tasks_completed), 1) * 100).toFixed(1) }}% {{ T.breachRate }}
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
        <span>{{ Number(stats.total_tasks_completed).toLocaleString() }} {{ T.attacks }}</span>
        <span class="text-tier-apex">{{ Number(stats.total_successful_attacks).toLocaleString() }} {{ T.breached }}</span>
      </div>
    </div>

    <!-- Agent Showcase -->
    <div v-if="agentProfiles.length > 0" class="mb-6 bg-shell-card border border-shell-border rounded-lg overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-shell-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            {{ T.agentShowcaseTitle }}
            <span class="text-xs font-normal text-shell-text ml-1">({{ agentProfiles.length }})</span>
          </h2>
          <p class="text-xs text-shell-text mt-0.5">{{ T.agentShowcaseSubtitle }}</p>
        </div>
        <!-- Difficulty filter -->
        <div class="flex gap-1">
          <button
            class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
            :class="agentFilterLevel === 'all'
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/40'
              : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
            @click="agentFilterLevel = 'all'"
          >{{ T.agentFilterAll }} ({{ agentProfiles.length }})</button>
          <button
            class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
            :class="agentFilterLevel === 'none'
              ? 'bg-red-500/15 text-red-400 border-red-500/40'
              : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
            @click="agentFilterLevel = 'none'"
          >{{ T.agentFilterEasy }} ({{ agentDifficulty.easy }})</button>
          <button
            class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
            :class="agentFilterLevel === 'basic'
              ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40'
              : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
            @click="agentFilterLevel = 'basic'"
          >{{ T.agentFilterMedium }} ({{ agentDifficulty.medium }})</button>
          <button
            class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
            :class="agentFilterLevel === 'advanced'
              ? 'bg-shell-green/15 text-shell-green border-shell-green/40'
              : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
            @click="agentFilterLevel = 'advanced'"
          >{{ T.agentFilterHard }} ({{ agentDifficulty.hard }})</button>
        </div>
      </div>
      <!-- Agent Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-shell-border/30">
        <div
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="bg-shell-card p-3 hover:bg-white/[0.02] transition-colors"
        >
          <!-- Agent name + chain -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <h3 class="text-xs font-mono font-medium text-white leading-tight truncate" :title="agent.name">{{ agent.name }}</h3>
            <span v-if="agent.targetChain" class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
              {{ agent.targetChain }}
            </span>
          </div>
          <!-- Tags row -->
          <div class="flex flex-wrap gap-1 mb-2">
            <!-- Defense level -->
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono border"
              :class="agent.defenseLevel === 'none'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : agent.defenseLevel === 'basic'
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  : 'bg-shell-green/10 text-shell-green border-shell-green/20'"
            >{{ agent.defenseLevel === 'none' ? T.agentDefNone : agent.defenseLevel === 'basic' ? T.agentDefBasic : T.agentDefAdvanced }}</span>
            <!-- Injection surface -->
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {{ agent.injectionSurface === 'token_data' ? T.agentSurfToken
                : agent.injectionSurface === 'chat_message' ? T.agentSurfChat
                : agent.injectionSurface === 'social_post' ? T.agentSurfSocial
                : agent.injectionSurface === 'email' ? T.agentSurfEmail
                : agent.injectionSurface }}
            </span>
          </div>
          <!-- Tool / Canary counts -->
          <div class="flex items-center gap-3 text-[10px] text-shell-text font-mono">
            <span>{{ T.agentTools }}: <span class="text-white">{{ agent.toolCount }}</span></span>
            <span>{{ T.agentCanary }}: <span class="text-tier-apex">{{ agent.canaryActionCount }}</span></span>
          </div>
        </div>
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
            <!-- Filter buttons -->
            <div class="ml-auto flex gap-1">
              <button
                class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
                :class="feedFilter === 'all'
                  ? 'bg-shell-green/15 text-shell-green border-shell-green/40'
                  : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
                @click="feedFilter = 'all'"
              >{{ T.filterAll }}</button>
              <button
                class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
                :class="feedFilter === 'success'
                  ? 'bg-tier-apex/15 text-tier-apex border-tier-apex/40'
                  : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
                @click="feedFilter = 'success'"
              >{{ T.filterSuccess }}</button>
              <button
                class="text-[10px] px-2 py-0.5 rounded font-mono border transition-colors"
                :class="feedFilter === 'rewarded'
                  ? 'bg-shell-green/15 text-shell-green border-shell-green/40'
                  : 'bg-transparent text-shell-text border-shell-border hover:border-shell-text/50'"
                @click="feedFilter = 'rewarded'"
              >{{ T.filterRewarded }}</button>
            </div>
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
                <div class="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-xs font-mono"
                  :class="entry.canaryTriggered
                    ? 'bg-tier-apex/15 text-tier-apex border border-tier-apex/30'
                    : 'bg-shell-border/30 text-shell-text border border-shell-border'
                  ">
                  {{ taskTypeIcons[entry.taskType] || '???' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(entry.tier)"></span>
                    <span class="font-mono text-xs truncate" :class="tierColor(entry.tier)">{{ entry.displayName }}</span>
                    <span class="text-shell-text text-xs">→</span>
                    <span v-if="entry.targetAgentName" class="text-xs text-purple-400 truncate hidden sm:inline" :title="entry.targetAgentName">{{ entry.targetAgentName }}</span>
                    <span v-else class="text-shell-text text-xs hidden sm:inline">{{ taskTypeLabels[entry.taskType] || entry.taskType }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <!-- Status badge -->
                  <span v-if="entry.canaryTriggered && entry.pointsAwarded > 0"
                    class="text-xs font-bold px-2 py-0.5 rounded bg-tier-apex/15 text-tier-apex border border-tier-apex/30">
                    BREACHED
                  </span>
                  <span v-else-if="entry.canaryTriggered && entry.pointsAwarded === 0"
                    class="text-xs font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                    :title="T.reasonDuplicate">
                    BREACHED
                  </span>
                  <span v-else class="text-xs text-shell-text px-2 py-0.5 rounded bg-shell-border/30 border border-shell-border">
                    BLOCKED
                  </span>
                  <!-- Reason tag for 0-point entries -->
                  <span v-if="entry.canaryTriggered && entry.pointsAwarded === 0"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400/80 border border-yellow-500/20 hidden sm:inline">
                    {{ T.reasonDuplicate }}
                  </span>
                  <span v-if="!entry.canaryTriggered && entry.pointsAwarded === 0"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-shell-border/20 text-shell-text/60 border border-shell-border/30 hidden sm:inline">
                    {{ T.reasonDefenseHeld }}
                  </span>
                  <!-- Mining mode badge -->
                  <span v-if="entry.miningMode === 'self_llm'"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 hidden sm:inline">
                    🤖 LLM
                  </span>
                  <span v-else
                    class="text-[10px] px-1.5 py-0.5 rounded bg-shell-border/20 text-shell-text/50 border border-shell-border/30 hidden sm:inline">
                    🆓 FREE
                  </span>
                  <!-- Points -->
                  <span v-if="entry.pointsAwarded > 0" class="text-shell-green font-mono text-sm font-bold">+{{ entry.pointsAwarded }}</span>
                  <span v-else-if="entry.canaryTriggered" class="text-yellow-400/60 font-mono text-sm">0</span>
                  <span v-else class="text-shell-text/40 font-mono text-sm">0</span>
                  <span class="text-shell-text text-xs w-14 text-right hidden sm:inline">{{ timeAgo(entry.verifiedAt) }}</span>
                </div>
              </div>

              <!-- Expandable Attack Detail -->
              <div v-if="expandedId === entry.id" class="px-4 pb-3 animate-fade-in">
                <div class="bg-black/50 rounded-lg p-4 border border-shell-border/50 space-y-4">

                  <!-- Target Agent Info -->
                  <div v-if="entry.targetAgentName" class="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <div>
                      <span class="text-shell-text">{{ T.targetAgent }}</span>
                      <p class="font-mono text-purple-400 font-medium">{{ entry.targetAgentName }}</p>
                    </div>
                    <div v-if="entry.targetAgentModel">
                      <span class="text-shell-text">{{ T.model }}</span>
                      <p class="font-mono text-white">{{ entry.targetAgentModel }}</p>
                    </div>
                    <div v-if="entry.targetChain">
                      <span class="text-shell-text">{{ T.chain }}</span>
                      <p class="font-mono text-cyan-400">{{ chainLabel(entry.targetChain) }}</p>
                    </div>
                    <div>
                      <span class="text-shell-text">{{ T.defense }}</span>
                      <p class="font-mono font-medium" :class="defenseLevelColor(entry.defenseLevel)">{{ defenseLevelLabel(entry.defenseLevel) }}</p>
                    </div>
                    <div>
                      <span class="text-shell-text">{{ T.surface }}</span>
                      <p class="font-mono text-yellow-400">{{ surfaceLabel(entry.injectionSurface) }}</p>
                    </div>
                    <div>
                      <span class="text-shell-text">{{ T.execMode }}</span>
                      <p class="font-mono" :class="entry.executionMode === 'local_compute' ? 'text-blue-400' : 'text-shell-text'">
                        {{ entry.executionMode === 'local_compute' ? T.localExec : T.sandboxExec }}
                      </p>
                    </div>
                  </div>

                  <!-- Canary Operations -->
                  <div v-if="entry.canaryActions?.length" class="text-xs">
                    <span class="text-shell-text font-mono uppercase tracking-wider">{{ T.canaryOps }}</span>
                    <div class="flex flex-wrap gap-1.5 mt-1.5">
                      <span
                        v-for="action in entry.canaryActions"
                        :key="action"
                        class="px-2 py-0.5 rounded font-mono border"
                        :class="entry.canaryTriggered
                          ? 'bg-tier-apex/10 text-tier-apex border-tier-apex/30'
                          : 'bg-shell-border/30 text-shell-text border-shell-border'"
                      >
                        {{ action.replace(/_/g, ' ') }}
                      </span>
                    </div>
                  </div>

                  <!-- Attack Chain -->
                  <div>
                    <div class="text-xs text-shell-text mb-2 font-mono uppercase tracking-wider">{{ T.attackChain }}</div>
                    <div class="space-y-2">
                      <div
                        v-for="(phase, i) in (attackPhases[entry.taskType] || ['Payload generation', 'Sandbox execution', 'Result verification'])"
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
                  </div>

                  <!-- Vulnerability Report (only for BREACHED) -->
                  <div v-if="entry.canaryTriggered && entry.vulnerabilitySummary" class="border-t border-tier-apex/20 pt-3">
                    <div class="text-xs font-mono uppercase tracking-wider text-tier-apex mb-1.5">{{ T.vulnReport }}</div>
                    <p class="text-xs font-mono text-tier-apex/80 leading-relaxed">{{ entry.vulnerabilitySummary }}</p>
                  </div>

                  <!-- Footer -->
                  <div class="pt-3 border-t border-shell-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div class="font-mono text-shell-text">
                      {{ T.taskType }}: <span class="text-white">{{ taskTypeLabels[entry.taskType] || entry.taskType }}</span>
                    </div>
                    <div v-if="entry.canaryTriggered && entry.pointsAwarded > 0" class="text-tier-apex font-bold font-mono">
                      VULNERABILITY CONFIRMED
                    </div>
                    <div v-else-if="entry.canaryTriggered && entry.pointsAwarded === 0" class="text-yellow-400 font-mono">
                      BREACHED — {{ T.reasonDuplicate }}
                    </div>
                    <div v-else class="text-shell-green font-mono">
                      {{ T.reasonDefenseHeld.toUpperCase() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Load more button -->
            <div v-if="feed.length > 0 && hasMore" class="px-4 py-3 text-center border-t border-shell-border/20">
              <button
                class="text-xs font-mono px-4 py-1.5 rounded border transition-colors"
                :class="loadingMore
                  ? 'border-shell-border text-shell-text cursor-wait'
                  : 'border-shell-green/40 text-shell-green hover:bg-shell-green/10 cursor-pointer'"
                :disabled="loadingMore"
                @click="fetchFeed(false)"
              >{{ loadingMore ? T.loadingMore : T.loadMore }}</button>
            </div>
            <div v-if="feed.length > 0 && !hasMore" class="px-4 py-2 text-center">
              <span class="text-[10px] font-mono text-shell-text/40">{{ T.noMore }}</span>
            </div>

            <div v-if="feed.length === 0 && !loading" class="px-4 py-12 text-center text-shell-text text-sm">
              <div class="font-mono mb-2">{{ T.waiting }}</div>
              <span class="cursor-blink text-shell-green">_</span>
            </div>
            <div v-if="loading" class="px-4 py-12 text-center text-shell-text text-sm">
              <span class="font-mono">{{ T.connecting }}</span>
              <span class="cursor-blink text-shell-green ml-1">_</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar (1/3) -->
      <div class="space-y-4">
        <!-- Top Miners -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <h3 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">{{ T.topMiners }}</h3>
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
          <h3 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">{{ T.networkStats }}</h3>
          <div v-if="stats" class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-shell-text">{{ T.activeMiners }}</span>
              <span class="font-mono">{{ Number(stats.total_miners).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-shell-text">{{ T.totalAttacks }}</span>
              <span class="font-mono">{{ Number(stats.total_tasks_completed).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-shell-text">{{ T.successful }}</span>
              <span class="font-mono text-tier-apex">{{ Number(stats.total_successful_attacks).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-shell-text">{{ T.pointsDist }}</span>
              <span class="font-mono text-shell-green">{{ Number(stats.total_points_distributed).toLocaleString() }}</span>
            </div>
          </div>
          <div v-else class="text-shell-text text-sm">{{ T.loadingStats }}</div>
        </div>

        <!-- Attack Type Legend -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <h3 class="text-xs font-semibold text-shell-text mb-4 uppercase tracking-wider">{{ T.attackTypes }}</h3>
          <div class="space-y-2">
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">{ }</span>
              <span class="text-shell-text">{{ T.tokenInjDesc }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">> _</span>
              <span class="text-shell-text">{{ T.seDesc }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">0x?</span>
              <span class="text-shell-text">{{ T.mpDesc }}</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="font-mono text-shell-green w-8">***</span>
              <span class="text-shell-text">{{ T.fcDesc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
