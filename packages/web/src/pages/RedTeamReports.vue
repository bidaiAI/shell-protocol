<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getRedTeamAgents, getRedTeamReports, type RedTeamAgent, type RedTeamReport, type RedTeamAccessTier } from '../lib/api'
import { useLang } from '../lib/i18n'

const { lang } = useLang()
const route = useRoute()

const agents = ref<RedTeamAgent[]>([])
const loading = ref(true)

// Compact report panel (per-agent)
const expandedAgent = ref<string | null>(null)
const reports = ref<RedTeamReport[]>([])
const reportsLoading = ref(false)
const totalBreaches = ref(0)
const accessTier = ref<RedTeamAccessTier | ''>('')
const reportsOffset = ref(0)
const hasMore = ref(false)
const expandedPayload = ref<string | null>(null)

// Showcase reports (promoted agent, bottom section)
const showcaseReports = ref<RedTeamReport[]>([])
const showcaseAgent = ref<string>('')
const showcaseLoading = ref(false)
const showcaseTotal = ref(0)
const showcaseAccessTier = ref<RedTeamAccessTier | ''>('')
const SHOWCASE_LIMIT = 6

const totalBreachesAll = computed(() => agents.value.reduce((s, a) => s + a.breachCount, 0))
const agentsBreached = computed(() => agents.value.filter(a => a.breachCount > 0).length)
const uniqueAttackersAll = computed(() => agents.value.reduce((s, a) => s + a.uniqueAttackers, 0))

const T = computed(() => lang.value === 'en' ? {
  title: 'Red Team Reports',
  subtitle: 'Adversarial security assessment of AI agents across the Web3 ecosystem',
  disclaimer: 'Payloads shown are for educational and security research purposes only. Do not use against unauthorized targets.',
  promoted: 'PUBLIC',
  breaches: 'breaches',
  attackers: 'attackers',
  latestBreach: 'Latest',
  viewReports: 'View Reports',
  collapse: 'Hide',
  payload: 'Payload',
  payloadLocked: 'Payload locked — breach this agent or wait for disclosure',
  disclosed: 'DISCLOSED',
  pending: 'PENDING',
  triggered: 'Triggered',
  points: 'pts',
  noAgents: 'No successful breaches recorded yet',
  noAgentsDesc: 'Be the first miner to breach an AI Agent',
  loadMore: 'View More Reports',
  loading: 'Loading...',
  defense: 'Defense',
  surface: 'Surface',
  model: 'Model',
  difficulty: 'Diff',
  taskType: 'Type',
  totalPayloads: 'breach payloads',
  agreeNotice: 'By viewing, you agree not to use these techniques against unauthorized targets',
  tier2Banner: 'Full payloads revealed after you breach this agent or the disclosure window expires.',
  showcaseTitle: 'Featured Breach Cases',
  showcaseDesc: 'Notable prompt injection attacks with full payloads disclosed',
  viewPayload: 'View',
  hidePayload: 'Hide',
} : {
  title: '红队报告',
  subtitle: 'Web3 生态 AI Agent 对抗性安全评估',
  disclaimer: '展示的 Payload 仅供安全研究和教育目的，不得用于未授权攻击。',
  promoted: '公开',
  breaches: '次攻破',
  attackers: '位矿工',
  latestBreach: '最近',
  viewReports: '查看报告',
  collapse: '收起',
  payload: 'Payload',
  payloadLocked: 'Payload 未公开 — 攻破该 Agent 或等待披露窗口',
  disclosed: '已披露',
  pending: '待披露',
  triggered: '触发',
  points: '分',
  noAgents: '暂无成功攻破记录',
  noAgentsDesc: '成为第一个攻破 AI Agent 的矿工',
  loadMore: '查看更多报告',
  loading: '加载中...',
  defense: '防御',
  surface: '攻击面',
  model: '模型',
  difficulty: '难度',
  taskType: '类型',
  totalPayloads: '个攻破记录',
  agreeNotice: '查看即视为同意不得将相关技术用于未授权攻击目标',
  tier2Banner: '完整 Payload 在你攻破该 Agent 或披露窗口期过后可见。',
  showcaseTitle: '经典攻破案例',
  showcaseDesc: '已披露的典型提示注入攻击手法',
  viewPayload: '查看',
  hidePayload: '收起',
})

const taskTypeLabel: Record<string, { en: string; zh: string }> = {
  token_injection: { en: 'Token Injection', zh: '代币注入' },
  social_engineering: { en: 'Social Eng.', zh: '社工' },
  memory_poisoning: { en: 'Memory Poison', zh: '记忆投毒' },
  full_chain: { en: 'Full Chain', zh: '全链' },
  repo_injection: { en: 'Repo Inject', zh: '代码注入' },
  search_poisoning: { en: 'Search Poison', zh: '搜索投毒' },
}

const defenseLevelLabel: Record<string, { en: string; zh: string; cls: string }> = {
  none: { en: 'None', zh: '无防御', cls: 'text-red-400 border-red-400/30' },
  basic: { en: 'Basic', zh: '基础', cls: 'text-yellow-400 border-yellow-400/30' },
  moderate: { en: 'Moderate', zh: '中等', cls: 'text-orange-400 border-orange-400/30' },
  hardened: { en: 'Hardened', zh: '强化', cls: 'text-blue-400 border-blue-400/30' },
  advanced: { en: 'Advanced', zh: '高级', cls: 'text-purple-400 border-purple-400/30' },
}

const tierColor: Record<string, string> = {
  apex: 'text-red-400',
  hunter: 'text-yellow-400',
  scout: 'text-shell-text/60',
}

function timeAgo(d: string | Date | null) {
  if (!d) return ''
  const ms = Date.now() - new Date(d as string).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return lang.value === 'en' ? `${mins}m ago` : `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang.value === 'en' ? `${hours}h ago` : `${hours}小时前`
  const days = Math.floor(hours / 24)
  return lang.value === 'en' ? `${days}d ago` : `${days}天前`
}

async function loadAgents() {
  try {
    const data = await getRedTeamAgents()
    agents.value = [...data.agents]
  } catch {
    // non-critical
  } finally {
    loading.value = false
  }
}

async function toggleAgent(agentName: string) {
  if (expandedAgent.value === agentName) {
    expandedAgent.value = null
    reports.value = []
    return
  }

  expandedAgent.value = agentName
  reports.value = []
  reportsOffset.value = 0
  accessTier.value = ''
  expandedPayload.value = null
  reportsLoading.value = true

  try {
    const data = await getRedTeamReports(agentName, 20, 0)
    reports.value = data.reports
    totalBreaches.value = data.totalBreaches
    accessTier.value = data.accessTier
    hasMore.value = data.reports.length < data.totalBreaches
  } catch {
    // non-critical
  } finally {
    reportsLoading.value = false
  }
}

async function loadMore() {
  if (!expandedAgent.value || reportsLoading.value) return
  reportsLoading.value = true
  const newOffset = reportsOffset.value + 20
  try {
    const data = await getRedTeamReports(expandedAgent.value, 20, newOffset)
    reports.value = [...reports.value, ...data.reports]
    reportsOffset.value = newOffset
    hasMore.value = reports.value.length < data.totalBreaches
  } catch {
    // ignore
  } finally {
    reportsLoading.value = false
  }
}

async function loadShowcase(agentName: string) {
  showcaseAgent.value = agentName
  showcaseLoading.value = true
  try {
    const data = await getRedTeamReports(agentName, SHOWCASE_LIMIT, 0)
    showcaseReports.value = data.reports
    showcaseTotal.value = data.totalBreaches
    showcaseAccessTier.value = data.accessTier
  } catch {
    // ignore
  } finally {
    showcaseLoading.value = false
  }
}

onMounted(async () => {
  await loadAgents()
  // Auto-expand from URL parameter ?agent=ElizaOS
  const agentParam = route.query.agent as string
  if (agentParam) {
    const match = agents.value.find(a =>
      a.agentName.toLowerCase().includes(agentParam.toLowerCase()),
    )
    if (match) {
      toggleAgent(match.agentName)
    }
  }
  // Load showcase for promoted agent (ElizaOS)
  const promoted = agents.value.find(a => a.isPromoted && a.breachCount > 0)
  if (promoted) {
    loadShowcase(promoted.agentName)
  }
})
</script>

<template>
  <div class="min-h-screen bg-black text-white px-4 py-8 max-w-5xl mx-auto">

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-red-400 font-mono flex items-center gap-3">
        <span class="text-red-500">&#9679;</span>
        {{ T.title }}
      </h1>
      <p class="text-shell-text text-sm mt-1.5">{{ T.subtitle }}</p>
    </div>

    <!-- Legal Disclaimer -->
    <div class="mb-6 border border-yellow-400/30 bg-yellow-400/5 rounded-lg px-4 py-3 text-xs text-yellow-300/80 flex items-start gap-2">
      <span class="text-base leading-none mt-0.5 flex-shrink-0">&#9888;&#65039;</span>
      <p>{{ T.disclaimer }}</p>
    </div>

    <!-- Achievement Wall Stats -->
    <div v-if="!loading && agents.length > 0" class="mb-6 grid grid-cols-3 gap-3">
      <div class="border border-red-400/20 bg-red-400/5 rounded-lg px-4 py-3 text-center">
        <div class="text-2xl font-mono font-bold text-red-400">{{ totalBreachesAll }}</div>
        <div class="text-xs text-shell-text/40 mt-0.5 font-mono">{{ lang === 'en' ? 'Total Breaches' : '总攻破次数' }}</div>
      </div>
      <div class="border border-orange-400/20 bg-orange-400/5 rounded-lg px-4 py-3 text-center">
        <div class="text-2xl font-mono font-bold text-orange-400">{{ agentsBreached }}<span class="text-sm text-shell-text/30">/{{ agents.length }}</span></div>
        <div class="text-xs text-shell-text/40 mt-0.5 font-mono">{{ lang === 'en' ? 'Agents Breached' : '被攻破 Agent' }}</div>
      </div>
      <div class="border border-yellow-400/20 bg-yellow-400/5 rounded-lg px-4 py-3 text-center">
        <div class="text-2xl font-mono font-bold text-yellow-400">{{ uniqueAttackersAll }}</div>
        <div class="text-xs text-shell-text/40 mt-0.5 font-mono">{{ lang === 'en' ? 'Attacker Instances' : '攻击者实例数' }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-shell-text/30 py-16 font-mono text-sm">{{ T.loading }}</div>

    <!-- No agents -->
    <div v-else-if="agents.length === 0"
      class="text-center text-shell-text/25 py-16 font-mono text-sm border border-dashed border-shell-border rounded-xl">
      {{ T.noAgents }}<br><span class="text-xs mt-1 block">{{ T.noAgentsDesc }}</span>
    </div>

    <!-- ═══ Agent Cards (compact — summary always visible) ═══ -->
    <div v-else class="space-y-2">
      <div
        v-for="agent in agents" :key="agent.agentName"
        class="border rounded-xl overflow-hidden transition-colors duration-150"
        :class="agent.breachCount > 0 ? 'border-red-400/20 hover:border-red-400/40' : 'border-shell-border/50 opacity-60'"
      >
        <!-- Card body: always visible -->
        <div class="px-4 py-3">
          <!-- Row 1: name + badges + stats -->
          <div class="flex items-center gap-2 flex-wrap">
            <a v-if="agent.officialUrl" :href="agent.officialUrl" target="_blank" rel="noopener"
              class="font-mono text-white font-semibold text-sm hover:text-blue-400 transition-colors"
              @click.stop>{{ agent.agentDisplayName || agent.agentName }} ↗</a>
            <span v-else class="font-mono text-white font-semibold text-sm">{{ agent.agentDisplayName || agent.agentName }}</span>
            <a v-if="agent.twitterHandle" :href="`https://x.com/${agent.twitterHandle.replace('@','')}`" target="_blank" rel="noopener"
              class="text-xs text-shell-text/40 hover:text-white transition-colors" @click.stop>𝕏</a>
            <span v-if="agent.defenseLevel"
              :class="['text-[10px] px-1 py-0.5 rounded border font-mono',
                defenseLevelLabel[agent.defenseLevel]?.cls || 'text-shell-text/50 border-shell-border']">
              {{ defenseLevelLabel[agent.defenseLevel]?.[lang] || agent.defenseLevel }}
            </span>
            <span v-if="agent.modelDisplay" class="text-[10px] px-1 py-0.5 rounded border border-blue-400/20 text-blue-400/50 font-mono">
              {{ agent.modelDisplay }}
            </span>
            <span v-if="agent.isPromoted"
              class="text-[10px] px-1 py-0.5 rounded border border-red-400/40 text-red-400 bg-red-400/10 font-mono uppercase">
              {{ T.promoted }}
            </span>
            <!-- Stats inline -->
            <span class="text-red-400/70 font-mono font-bold text-xs ml-auto">{{ agent.breachCount }} {{ T.breaches }}</span>
            <span class="text-xs text-shell-text/40">{{ agent.uniqueAttackers }} {{ T.attackers }}</span>
            <span class="text-xs text-shell-text/30 hidden sm:inline">{{ timeAgo(agent.latestBreachAt) }}</span>
          </div>

          <!-- Row 2: summary (always visible, the core Phase 2 content) -->
          <p v-if="agent.summary" class="mt-1.5 text-xs text-shell-text/50 font-mono leading-relaxed">
            {{ agent.summary }}
          </p>

          <!-- Row 3: triggered actions (always visible) -->
          <div v-if="agent.latestTriggeredActions && agent.latestTriggeredActions.length > 0"
            class="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] text-red-400/40 font-mono">{{ T.triggered }}:</span>
            <span
              v-for="action in agent.latestTriggeredActions" :key="action"
              class="text-[10px] bg-red-400/10 text-red-300/60 px-1.5 py-0.5 rounded font-mono border border-red-400/15"
            >{{ action.replace(/_/g, ' ') }}</span>
          </div>

          <!-- Row 4: "View N reports →" compact link -->
          <div v-if="agent.breachCount > 0" class="mt-2">
            <button
              class="text-[11px] font-mono transition-colors"
              :class="expandedAgent === agent.agentName ? 'text-red-400' : 'text-shell-text/30 hover:text-red-400/70'"
              @click="toggleAgent(agent.agentName)"
            >
              {{ expandedAgent === agent.agentName ? T.collapse : `${T.viewReports} (${agent.breachCount})` }}
              <span class="transition-transform duration-200 inline-block"
                :class="expandedAgent === agent.agentName ? 'rotate-180' : ''">&#9660;</span>
            </button>
          </div>
        </div>

        <!-- ═══ Compact Report Panel (expandable, limited height) ═══ -->
        <div v-if="expandedAgent === agent.agentName" class="border-t border-red-400/15 bg-black/30">
          <div v-if="reportsLoading && reports.length === 0" class="p-4 text-center text-shell-text/30 font-mono text-xs">
            {{ T.loading }}
          </div>
          <div v-else-if="reports.length > 0">
            <!-- Tier 2 note -->
            <div v-if="accessTier === 'tier2_public'" class="px-4 pt-3 pb-1 text-[10px] text-yellow-400/60 font-mono">
              &#128274; {{ T.tier2Banner }}
            </div>
            <!-- Compact table -->
            <div class="max-h-64 overflow-y-auto">
              <table class="w-full text-[11px] font-mono">
                <tbody>
                  <tr v-for="(report, idx) in reports" :key="report.id"
                    class="border-b border-red-400/5 hover:bg-red-400/5 transition-colors">
                    <td class="px-3 py-2 text-shell-text/25 w-8">#{{ idx + 1 + reportsOffset }}</td>
                    <td class="py-2">
                      <span :class="tierColor[report.minerTier] || 'text-shell-text/50'" class="font-semibold">{{ report.minerName }}</span>
                    </td>
                    <td class="py-2 text-red-400 font-bold">+{{ report.pointsAwarded }}</td>
                    <td class="py-2 text-shell-text/30">{{ (taskTypeLabel[report.taskType] || {})[lang] || report.taskType }}</td>
                    <td class="py-2 text-shell-text/20 hidden sm:table-cell">{{ timeAgo(report.verifiedAt) }}</td>
                    <td class="py-2 pr-3 text-right">
                      <span v-if="report.payloadVisible && report.payload"
                        class="cursor-pointer text-red-400/60 hover:text-red-400"
                        @click="expandedPayload = expandedPayload === report.id ? null : report.id">
                        {{ expandedPayload === report.id ? T.hidePayload : T.viewPayload }}
                      </span>
                      <span v-else-if="report.disclosureStatus === 'disclosed'"
                        class="text-green-400/50">{{ T.disclosed }}</span>
                      <span v-else class="text-orange-400/40">&#128274;</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Inline payload expand -->
            <div v-if="expandedPayload" class="px-4 py-3 border-t border-red-400/10">
              <pre v-for="report in reports.filter(r => r.id === expandedPayload)" :key="'p-'+report.id"
                class="bg-black/60 border border-red-400/15 rounded-lg p-3 text-xs font-mono text-red-200/80
                  overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{{ report.payload }}</pre>
            </div>
            <!-- Load more -->
            <div v-if="hasMore" class="px-4 py-2 border-t border-red-400/5">
              <button @click="loadMore" :disabled="reportsLoading"
                class="text-[11px] font-mono text-shell-text/30 hover:text-red-400/70 transition-colors disabled:opacity-50">
                {{ reportsLoading ? T.loading : T.loadMore }} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Featured Breach Cases (ElizaOS showcase, bottom) ═══ -->
    <div v-if="showcaseReports.length > 0" class="mt-10">
      <div class="border-t border-red-400/30 pt-6 mb-4">
        <h2 class="text-lg font-bold text-red-400 font-mono flex items-center gap-2">
          <span class="text-red-500">&#9760;</span>
          {{ T.showcaseTitle }}
        </h2>
        <p class="text-xs text-shell-text/40 mt-1">
          {{ T.showcaseDesc }} — {{ showcaseAgent.replace(/\s*\([^)]*\)\s*$/, '') }}
          <span class="text-shell-text/25">({{ showcaseTotal }} {{ T.totalPayloads }})</span>
        </p>
      </div>

      <div class="space-y-4">
        <div
          v-for="(report, idx) in showcaseReports" :key="'sc-'+report.id"
          class="border border-red-400/20 rounded-xl overflow-hidden bg-black/40"
        >
          <!-- Report header -->
          <div class="px-4 py-3 border-b border-red-400/10 flex items-center gap-3 flex-wrap text-xs">
            <span class="text-shell-text/30 font-mono">#{{ idx + 1 }}</span>
            <span :class="tierColor[report.minerTier] || 'text-shell-text/50'" class="font-mono font-semibold">
              {{ report.minerName }}
            </span>
            <span class="text-shell-text/30">&#183;</span>
            <span class="font-mono text-shell-text/40">{{ report.minerTier }}</span>
            <span class="text-shell-text/30">&#183;</span>
            <span class="text-red-400 font-mono font-bold">+{{ report.pointsAwarded }} {{ T.points }}</span>
            <span class="text-shell-text/30">&#183;</span>
            <span class="text-shell-text/30 font-mono">
              {{ (taskTypeLabel[report.taskType] || {})[lang] || report.taskType }}
            </span>
            <span v-if="report.modelDisplay"
              class="text-xs px-1.5 py-0.5 rounded border border-blue-400/20 text-blue-400/60 font-mono">
              {{ report.modelDisplay }}
            </span>
            <span v-if="report.disclosureStatus === 'disclosed'"
              class="text-xs px-1.5 py-0.5 rounded border border-green-400/30 text-green-400/70 bg-green-400/10 font-mono uppercase">
              {{ T.disclosed }}
            </span>
            <span class="ml-auto text-shell-text/25 hidden sm:inline">{{ timeAgo(report.verifiedAt) }}</span>
          </div>

          <!-- Payload -->
          <div v-if="report.payloadVisible && report.payload" class="p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-mono text-red-400/50 border border-red-400/20 px-1.5 py-0.5 rounded">{{ T.payload }}</span>
              <span class="text-xs text-shell-text/25 font-mono">
                {{ T.difficulty }}: {{ report.difficulty }} &#183;
                {{ T.defense }}: {{ defenseLevelLabel[report.defenseLevel]?.[lang] || report.defenseLevel }} &#183;
                {{ T.surface }}: {{ report.injectionSurface }}
              </span>
            </div>
            <pre class="bg-black/60 border border-red-400/15 rounded-lg p-3 text-xs font-mono text-red-200/80
                        overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{{ report.payload }}</pre>
          </div>
          <div v-else class="p-4">
            <div class="bg-black/40 border border-red-400/10 rounded-lg px-4 py-3 text-center">
              <span class="text-orange-400/50 text-sm">&#128274;</span>
              <p class="text-[10px] text-shell-text/30 mt-1 font-mono">{{ T.payloadLocked }}</p>
            </div>
          </div>

          <!-- Triggered actions -->
          <div v-if="report.triggeredActions && report.triggeredActions.length > 0"
            class="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <span class="text-xs text-red-400/40 font-mono">{{ T.triggered }}:</span>
            <span
              v-for="action in report.triggeredActions" :key="String(action)"
              class="text-xs bg-red-400/10 text-red-300 px-2 py-0.5 rounded font-mono border border-red-400/20"
            >{{ String(action).replace(/_/g, ' ') }}</span>
          </div>
        </div>
      </div>

      <!-- View all link -->
      <div v-if="showcaseTotal > SHOWCASE_LIMIT" class="text-center mt-4">
        <button
          @click="toggleAgent(showcaseAgent)"
          class="text-sm font-mono text-red-400/60 hover:text-red-400 border border-red-400/20 px-5 py-2 rounded-lg transition-colors">
          {{ T.loadMore }} ({{ showcaseTotal }}) →
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-10 border-t border-shell-border pt-6 text-xs text-shell-text/25 text-center space-y-1">
      <p>{{ T.agreeNotice }}</p>
      <p>
        <RouterLink to="/disclosures" class="text-red-400/40 hover:text-red-400 transition-colors">
          {{ lang === 'en' ? 'View White Hat Disclosures' : '查看白帽漏洞公示' }}
        </RouterLink>
        &#183;
        <RouterLink to="/tasks" class="text-red-400/40 hover:text-red-400 transition-colors">
          {{ lang === 'en' ? 'Attack Feed' : '攻击动态' }}
        </RouterLink>
      </p>
    </div>
  </div>
</template>
