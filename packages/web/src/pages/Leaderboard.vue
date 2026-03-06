<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getLeaderboard, type LeaderboardEntry } from '../lib/api'

const entries = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const page = ref(0)
const pageSize = 50

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

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatPoints(n: number) {
  return n.toLocaleString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
    <h1 class="text-3xl font-bold mb-6">排行榜</h1>

    <!-- Table -->
    <div class="bg-shell-card border border-shell-border rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-shell-border text-shell-text text-left">
            <th class="px-4 py-3 w-12">#</th>
            <th class="px-4 py-3">矿工</th>
            <th class="px-4 py-3">段位</th>
            <th class="px-4 py-3 text-right">积分</th>
            <th class="px-4 py-3 text-right hidden sm:table-cell">攻击数</th>
            <th class="px-4 py-3 text-right hidden sm:table-cell">成功率</th>
          </tr>
        </thead>
        <tbody v-if="!loading">
          <tr
            v-for="(entry, i) in entries"
            :key="entry.walletAddress"
            class="border-b border-shell-border/50 hover:bg-shell-border/20 transition-colors"
          >
            <td class="px-4 py-3 text-shell-text">{{ page * pageSize + i + 1 }}</td>
            <td class="px-4 py-3 font-mono text-xs">{{ shortAddr(entry.walletAddress) }}</td>
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
            <td colspan="6" class="px-4 py-12 text-center text-shell-text">加载中...</td>
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
        上一页
      </button>
      <span class="text-shell-text">第 {{ page + 1 }} 页</span>
      <button
        :disabled="!hasNext"
        class="text-shell-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        @click="nextPage"
      >
        下一页
      </button>
    </div>
  </div>
</template>
