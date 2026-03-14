<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getBotNotice, type BotNoticeEntry } from '../lib/api'
import { useLang } from '../lib/i18n'

const { lang } = useLang()

const accounts = ref<BotNoticeEntry[]>([])
const total = ref(0)
const totalPoints = ref(0)
const generatedAt = ref('')
const loading = ref(true)
const error = ref('')

const T = computed(() => lang.value === 'en' ? {
  title: 'Anti-Cheat Notice',
  subtitle: 'Shell Oracle Bot Account Registry',
  desc: 'The following accounts were detected bypassing the official sandbox client. They called LLM APIs directly without running local agent simulations, and have been permanently frozen.',
  statsAccounts: 'Accounts Frozen',
  statsPoints: 'Points Frozen',
  colRank: '#',
  colAgent: 'Agent',
  colPoints: 'Points',
  colSubs: 'Samples',
  colAvg: 'Avg Time(s)',
  colFast: '<3s%',
  colMax: 'Max(s)',
  colMode: 'Mode',
  colStatus: 'Status',
  frozenTag: 'Frozen',
  pendingTag: 'Pending',
  modePro: 'Pro',
  modeFree: 'Free',
  loading: 'Loading...',
  err: 'Failed to load data.',
  updatedAt: 'Generated at',
  evidenceTitle: 'Detection Methodology',
  evidenceItems: [
    '≥80% of submissions completed in <3s after assignment (sandbox requires 5–30s for real inference)',
    'Median response time <3s, max response time <30s across ≥15 verified samples per account',
    'Submissions on peer-review tasks (is_verify_task=true) completed in 0.1–1.3s (reading + judging requires ≥5s)',
    'Many primary submissions are literal LLM safety refusals: "Sorry, I can\'t fulfill this request..." — proof of direct API calls, not sandbox execution',
    'Normal miners average 5–9s; any real LLM inference has a hard lower bound of ~1.5s',
  ],
  note: 'Points are permanently forfeited. No appeal process — the timing evidence is statistically unambiguous.',
} : {
  title: '反作弊公告',
  subtitle: 'Shell Oracle 作弊账号公示',
  desc: '以下账号被检测为绕过官方沙盒客户端，直接调用 LLM API 提交，从未在本地运行沙盒模拟。所有账号已被永久冻结。',
  statsAccounts: '冻结账号数',
  statsPoints: '冻结积分',
  colRank: '#',
  colAgent: '矿工',
  colPoints: '积分',
  colSubs: '样本数',
  colAvg: '平均时间(s)',
  colFast: '<3s比率',
  colMax: '最大(s)',
  colMode: '模式',
  colStatus: '状态',
  frozenTag: '已冻结',
  pendingTag: '待处理',
  modePro: '高效',
  modeFree: '免费',
  loading: '加载中...',
  err: '加载失败，请刷新重试。',
  updatedAt: '数据生成于',
  evidenceTitle: '检测方法说明',
  evidenceItems: [
    '80%+ 提交在分配后 <3 秒完成（沙盒模拟正常需要 5–30 秒推理时间）',
    '每账号 ≥15 条样本，中位响应 <3s，最大响应 <30s，统计显著',
    '同行互验任务（is_verify_task=true）在 0.1–1.3s 完成（阅读+判断至少需要 5s）',
    '大量主任务提交为 LLM 安全过滤输出："Sorry, I can\'t fulfill this request..." — 直接调用 LLM API 的铁证',
    '正常矿工平均 5–9 秒；任何真实 LLM 推理的物理下限约 1.5 秒',
  ],
  note: '积分不予恢复，无申诉渠道——响应时间统计证据无歧义。',
})

onMounted(async () => {
  try {
    const data = await getBotNotice()
    accounts.value = data.accounts
    total.value = data.total
    totalPoints.value = data.totalPoints
    generatedAt.value = data.generatedAt
  }
  catch (e) {
    error.value = T.value.err
    console.error(e)
  }
  finally {
    loading.value = false
  }
})

function formatPoints(n: number) {
  return n.toLocaleString()
}

function formatDate(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—'
}

function formatGenTime(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <span class="inline-block w-2 h-6 bg-red-500 rounded-sm"></span>
        <h1 class="text-3xl font-bold text-red-400">{{ T.title }}</h1>
      </div>
      <p class="text-shell-text text-sm mb-1 font-mono">{{ T.subtitle }}</p>
      <p class="text-shell-text/70 text-sm max-w-3xl leading-relaxed">{{ T.desc }}</p>
    </div>

    <!-- Stats bar -->
    <div class="grid grid-cols-2 gap-4 mb-8" v-if="!loading && !error">
      <div class="bg-shell-card border border-red-500/30 rounded-lg p-4">
        <div class="text-2xl font-bold text-red-400 font-mono">{{ total }}</div>
        <div class="text-xs text-shell-text mt-1">{{ T.statsAccounts }}</div>
      </div>
      <div class="bg-shell-card border border-red-500/30 rounded-lg p-4">
        <div class="text-2xl font-bold text-red-400 font-mono">{{ formatPoints(totalPoints) }}</div>
        <div class="text-xs text-shell-text mt-1">{{ T.statsPoints }}</div>
      </div>
    </div>

    <!-- Evidence methodology -->
    <div class="bg-shell-card border border-shell-border rounded-lg p-5 mb-8">
      <h2 class="text-sm font-semibold text-shell-green mb-3 uppercase tracking-wider">{{ T.evidenceTitle }}</h2>
      <ul class="space-y-2">
        <li
          v-for="(item, i) in T.evidenceItems"
          :key="i"
          class="flex gap-2 text-sm text-shell-text/80"
        >
          <span class="text-shell-green flex-shrink-0 mt-0.5">›</span>
          <span>{{ item }}</span>
        </li>
      </ul>
      <p class="mt-4 text-xs text-red-400/80 border-t border-shell-border pt-3">{{ T.note }}</p>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="text-center text-shell-text py-12">{{ T.loading }}</div>
    <div v-else-if="error" class="text-center text-red-400 py-12">{{ error }}</div>

    <!-- Table -->
    <div v-else class="bg-shell-card border border-shell-border rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-shell-border text-shell-text text-left bg-shell-border/20">
              <th class="px-3 py-3 w-10">{{ T.colRank }}</th>
              <th class="px-3 py-3">{{ T.colAgent }}</th>
              <th class="px-3 py-3 text-right">{{ T.colPoints }}</th>
              <th class="px-3 py-3 text-right hidden sm:table-cell">{{ T.colSubs }}</th>
              <th class="px-3 py-3 text-right hidden sm:table-cell">{{ T.colAvg }}</th>
              <th class="px-3 py-3 text-right hidden md:table-cell">{{ T.colFast }}</th>
              <th class="px-3 py-3 text-right hidden md:table-cell">{{ T.colMax }}</th>
              <th class="px-3 py-3 text-center hidden lg:table-cell">{{ T.colMode }}</th>
              <th class="px-3 py-3 text-center">{{ T.colStatus }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, i) in accounts"
              :key="entry.agentName"
              class="border-b border-shell-border/40 hover:bg-red-500/5 transition-colors"
            >
              <td class="px-3 py-2.5 text-shell-text/50 text-xs">{{ i + 1 }}</td>
              <td class="px-3 py-2.5 font-mono text-xs text-white/90">{{ entry.agentName || '—' }}</td>
              <td class="px-3 py-2.5 text-right font-mono text-red-400 text-xs">{{ formatPoints(entry.shellPoints) }}</td>
              <td class="px-3 py-2.5 text-right text-shell-text text-xs hidden sm:table-cell">{{ entry.submissions }}</td>
              <td class="px-3 py-2.5 text-right font-mono text-xs hidden sm:table-cell"
                :class="entry.avgSec < 1 ? 'text-red-400' : entry.avgSec < 2 ? 'text-orange-400' : 'text-yellow-400'">
                {{ entry.avgSec }}s
              </td>
              <td class="px-3 py-2.5 text-right font-mono text-xs hidden md:table-cell text-red-400">
                {{ entry.fastPct }}%
              </td>
              <td class="px-3 py-2.5 text-right font-mono text-xs hidden md:table-cell text-shell-text/70">
                {{ entry.maxSec }}s
              </td>
              <td class="px-3 py-2.5 text-center hidden lg:table-cell">
                <span
                  v-if="entry.miningMode === 'self_llm'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400"
                >{{ T.modePro }}</span>
                <span
                  v-else
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400"
                >{{ T.modeFree }}</span>
              </td>
              <td class="px-3 py-2.5 text-center">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                  {{ entry.isFrozen ? T.frozenTag : T.pendingTag }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer timestamp -->
    <div v-if="generatedAt && !loading" class="mt-4 text-xs text-shell-text/40 text-right font-mono">
      {{ T.updatedAt }}: {{ formatGenTime(generatedAt) }}
    </div>
  </div>
</template>
