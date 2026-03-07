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
  colMiner: 'Miner', colTier: 'Tier', colPoints: 'Points',
  colAttacks: 'Attacks', colSuccessRate: 'Success Rate',
  loading: 'Loading...', prev: 'Prev', next: 'Next',
  pageLabel: `Page ${page.value + 1}`,
} : {
  title: '排行榜',
  colMiner: '矿工', colTier: '段位', colPoints: '积分',
  colAttacks: '攻击数', colSuccessRate: '成功率',
  loading: '加载中...', prev: '上一页', next: '下一页',
  pageLabel: `第 ${page.value + 1} 页`,
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

function formatPoints(n: number) {
  return n.toLocaleString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
    <h1 class="text-3xl font-bold mb-6">{{ T.title }}</h1>

    <!-- Table -->
    <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-shell-border text-shell-text text-left">
            <th class="px-4 py-3 w-12">#</th>
            <th class="px-4 py-3">{{ T.colMiner }}</th>
            <th class="px-4 py-3">{{ T.colTier }}</th>
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
            <td class="px-4 py-3 font-mono text-xs">{{ entry.displayName }}</td>
            <td class="px-4 py-3">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" :class="tierDot(entry.tier)"></span>
                <span class="capitalize" :class="tierColor(entry.tier)">{{ entry.tier }}</span>
              </span>
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
            <td colspan="6" class="px-4 py-12 text-center text-shell-text">{{ T.loading }}</td>
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
