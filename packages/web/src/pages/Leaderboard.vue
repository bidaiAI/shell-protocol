<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getLeaderboard, type LeaderboardEntry } from '../lib/api'
import { useLang } from '../lib/i18n'

const { lang } = useLang()

const entries = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const page = ref(0)
const pageSize = 50

const T = computed(() => lang.value === 'en' ? {
  title: 'Leaderboard',
  antiCheatNotice: 'Any user found bypassing the official client with unauthorized scripts will be permanently banned without appeal.',
  colMiner: 'Miner', colTier: 'Tier', colPoints: 'Points',
  colMode: 'Mode',
  colAttacks: 'Breaches', colSuccessRate: 'Success Rate',
  loading: 'Loading...', prev: 'Prev', next: 'Next',
  pageLabel: `Page ${page.value + 1}`,
  modeFree: 'Free', modeSelfLlm: 'Pro',
  slashedTag: 'Penalized',
  slashedTip: 'Points deducted due to honeypot detection failures',
  frozenTag: 'Cheat-Frozen',
  frozenTip: 'Account frozen for cheating — bypassed sandbox, called LLM API directly. See openshell.cc/bot-notice',
  tierScout: 'Scout', tierHunter: 'Hunter', tierApex: 'Apex',
  toHunter: (n: number) => `${n} to Hunter`,
  toApex: (n: number) => `${n} to Apex`,
} : {
  title: '排行榜',
  antiCheatNotice: '任何绕过官方客户端、使用非法脚本的用户，直接封号，不予申诉。',
  colMiner: '矿工', colTier: '段位', colPoints: '积分',
  colMode: '模式',
  colAttacks: '攻破数', colSuccessRate: '成功率',
  loading: '加载中...', prev: '上一页', next: '下一页',
  pageLabel: `第 ${page.value + 1} 页`,
  modeFree: '免费', modeSelfLlm: '高效',
  slashedTag: '已处罚',
  slashedTip: '因蜜罐检测失败被扣除积分',
  frozenTag: '作弊冻结',
  frozenTip: '账号已因作弊被永久冻结——绕过沙盒直接调用 LLM API。详见 openshell.cc/bot-notice',
  tierScout: '侦察者', tierHunter: '猎手', tierApex: '顶点',
  toHunter: (n: number) => `差 ${n} 升猎手`,
  toApex: (n: number) => `差 ${n} 升顶点`,
})

onMounted(() => loadPage())

async function loadPage() {
  loading.value = true
  try {
    const data = await getLeaderboard(pageSize, page.value * pageSize)
    entries.value = data.leaderboard
  }
  catch (err) {
    console.error('Failed to load leaderboard:', err)
  }
  finally {
    loading.value = false
  }
}

function nextPage() {
  if (entries.value.length < pageSize) return
  page.value++
  loadPage()
}

function prevPage() {
  if (page.value === 0) return
  page.value--
  loadPage()
}

const hasPrev = computed(() => page.value > 0)
const hasNext = computed(() => entries.value.length === pageSize)

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

function tierLabel(tier: string) {
  switch (tier) {
    case 'apex': return T.value.tierApex
    case 'hunter': return T.value.tierHunter
    default: return T.value.tierScout
  }
}

// Progress to next tier (hunter=20 attacks+30% rate, apex=100 attacks+50% rate)
function tierProgress(entry: LeaderboardEntry): string | null {
  if (entry.tier === 'apex') return null
  if (entry.tier === 'hunter') {
    const needed = 100 - entry.totalSuccessfulAttacks
    return needed > 0 ? T.value.toApex(needed) : null
  }
  // scout
  const toHunter = 20 - entry.totalSuccessfulAttacks
  if (toHunter > 0) return T.value.toHunter(toHunter)
  const toApex = 100 - entry.totalSuccessfulAttacks
  return toApex > 0 ? T.value.toApex(toApex) : null
}

function formatPoints(n: number) {
  return n.toLocaleString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
    <h1 class="text-3xl font-bold mb-6">{{ T.title }}</h1>

    <p class="text-xs text-yellow-400/80 mb-6 border border-yellow-400/20 rounded px-3 py-2 bg-yellow-400/5">
      ⚠️ {{ T.antiCheatNotice }}
    </p>

    <!-- Table -->
    <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-shell-border text-shell-text text-left">
            <th class="px-4 py-3 w-12">#</th>
            <th class="px-4 py-3">{{ T.colMiner }}</th>
            <th class="px-4 py-3">{{ T.colTier }}</th>
            <th class="px-4 py-3 hidden sm:table-cell">{{ T.colMode }}</th>
            <th class="px-4 py-3 text-right">{{ T.colPoints }}</th>
            <th class="px-4 py-3 text-right hidden sm:table-cell">{{ T.colAttacks }}</th>
            <th class="px-4 py-3 text-right hidden sm:table-cell">{{ T.colSuccessRate }}</th>
          </tr>
        </thead>
        <tbody v-if="!loading">
          <tr
            v-for="(entry, i) in entries"
            :key="entry.displayName"
            class="border-b border-shell-border/50 hover:bg-shell-border/20 transition-colors"
          >
            <td class="px-4 py-3 text-shell-text">{{ page * pageSize + i + 1 }}</td>
            <td class="px-4 py-3 font-mono text-xs">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span>{{ entry.displayName }}</span>
                <span
                  v-if="entry.isFrozen"
                  :title="T.frozenTip"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 cursor-help"
                >{{ T.frozenTag }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-col gap-0.5">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="tierDot(entry.tier)"></span>
                  <span :class="tierColor(entry.tier)" class="font-semibold text-xs">{{ tierLabel(entry.tier) }}</span>
                </span>
                <span v-if="tierProgress(entry)" class="text-xs text-shell-text/30 pl-3.5 font-mono">
                  {{ tierProgress(entry) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell">
              <span
                v-if="entry.miningMode === 'self_llm'"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400"
              >{{ T.modeSelfLlm }}</span>
              <span
                v-else
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400"
              >{{ T.modeFree }}</span>
            </td>
            <td class="px-4 py-3 text-right font-mono text-shell-green">{{ formatPoints(entry.shellPoints) }}</td>
            <td class="px-4 py-3 text-right hidden sm:table-cell">{{ entry.totalSuccessfulAttacks }}</td>
            <td class="px-4 py-3 text-right text-shell-text hidden sm:table-cell">
              {{ entry.totalTasksCompleted > 0
                ? `${(entry.totalSuccessfulAttacks / entry.totalTasksCompleted * 100).toFixed(1)}%`
                : '—' }}
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="7" class="px-4 py-12 text-center text-shell-text">{{ T.loading }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4 text-sm">
      <button
        :disabled="!hasPrev"
        class="text-shell-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        @click="prevPage"
      >
        {{ T.prev }}
      </button>
      <span class="text-shell-text">{{ T.pageLabel }}</span>
      <button
        :disabled="!hasNext"
        class="text-shell-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        @click="nextPage"
      >
        {{ T.next }}
      </button>
    </div>
  </div>
</template>
