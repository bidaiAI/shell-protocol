<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getMyBreaches, getBreachLeaders, type BreachRecord, type BreachLeader } from '../lib/api'
import { useLang } from '../lib/i18n'
import { getToken } from '../lib/api'

const { lang } = useLang()

const myBreaches = ref<BreachRecord[]>([])
const leaders = ref<BreachLeader[]>([])
const loadingMine = ref(true)
const loadingLeaders = ref(true)
const isLoggedIn = computed(() => !!getToken())

const T = computed(() => lang.value === 'en' ? {
  title: 'Breach Records',
  subtitle: 'Agents successfully attacked by verified self_llm miners',
  myTitle: 'My Breaches',
  leadersTitle: 'Breach Leaderboard',
  colRank: 'Rank',
  colMiner: 'Miner',
  colAgents: 'Agents Breached',
  colTotal: 'Total Breaches',
  colFirst: 'First Breach',
  colAgent: 'Agent',
  colDefense: 'Defense',
  colDate: 'First Breached',
  loading: 'Loading...',
  noBreaches: 'No breaches yet. Keep attacking!',
  noLeaders: 'No breach records yet.',
  loginPrompt: 'Sign in to see your personal breach records.',
  freePrompt: 'Only self_llm miners\' breaches are counted. Upgrade to track your achievements.',
  upgradeBtn: 'Upgrade to Self-LLM',
  defenseNone: 'None',
  defenseBasic: 'Basic',
  defenseAdvanced: 'Advanced',
} : {
  title: '攻破记录',
  subtitle: '经验证的 self_llm 矿工成功攻破的 Agent 列表',
  myTitle: '我的攻破',
  leadersTitle: '攻破排行榜',
  colRank: '排名',
  colMiner: '矿工',
  colAgents: '攻破Agent数',
  colTotal: '总攻破次数',
  colFirst: '首次攻破',
  colAgent: 'Agent',
  colDefense: '防御等级',
  colDate: '首次攻破时间',
  loading: '加载中...',
  noBreaches: '暂无攻破记录，继续挑战！',
  noLeaders: '暂无攻破记录。',
  loginPrompt: '请登录以查看您的个人攻破记录。',
  freePrompt: '仅计入 self_llm 矿工的攻破记录。升级后可追踪您的成就。',
  upgradeBtn: '升级为 Self-LLM',
  defenseNone: '无防御',
  defenseBasic: '基础防御',
  defenseAdvanced: '高级防御',
})

function defenseLabel(level: string) {
  if (level === 'advanced') return T.value.defenseAdvanced
  if (level === 'basic') return T.value.defenseBasic
  return T.value.defenseNone
}

function defenseColor(level: string) {
  if (level === 'advanced') return 'text-red-400'
  if (level === 'basic') return 'text-yellow-400'
  return 'text-green-400'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(lang.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

onMounted(async () => {
  // Load leaders (public)
  try {
    const data = await getBreachLeaders(50)
    leaders.value = data.leaders
  } catch (e) {
    console.error(e)
  } finally {
    loadingLeaders.value = false
  }

  // Load personal breaches (auth required)
  if (isLoggedIn.value) {
    try {
      const data = await getMyBreaches()
      myBreaches.value = data.breaches
    } catch (e) {
      console.error(e)
    } finally {
      loadingMine.value = false
    }
  } else {
    loadingMine.value = false
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-10 space-y-12">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-white">{{ T.title }}</h1>
      <p class="text-shell-text mt-1 text-sm">{{ T.subtitle }}</p>
    </div>

    <!-- My Breaches -->
    <section>
      <h2 class="text-xl font-semibold text-white mb-4">{{ T.myTitle }}</h2>

      <div v-if="!isLoggedIn" class="bg-shell-card border border-shell-border rounded-lg p-6 text-shell-text text-sm">
        {{ T.loginPrompt }}
      </div>

      <div v-else-if="loadingMine" class="text-shell-text text-sm">{{ T.loading }}</div>

      <div v-else-if="myBreaches.length === 0" class="bg-shell-card border border-shell-border rounded-lg p-6 space-y-2">
        <p class="text-shell-text text-sm">{{ T.noBreaches }}</p>
        <p class="text-shell-text/60 text-xs">{{ T.freePrompt }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-shell-text border-b border-shell-border">
              <th class="pb-3 text-left font-medium">{{ T.colAgent }}</th>
              <th class="pb-3 text-left font-medium">{{ T.colDefense }}</th>
              <th class="pb-3 text-right font-medium">{{ T.colDate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in myBreaches"
              :key="b.agent_name"
              class="border-b border-shell-border/40 hover:bg-shell-card/50 transition-colors"
            >
              <td class="py-3 text-white font-medium">{{ b.agent_name }}</td>
              <td class="py-3">
                <span :class="defenseColor(b.defense_level)" class="text-xs font-medium">
                  {{ defenseLabel(b.defense_level) }}
                </span>
              </td>
              <td class="py-3 text-right text-shell-text">{{ formatDate(b.first_breach_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Breach Leaderboard -->
    <section>
      <h2 class="text-xl font-semibold text-white mb-4">{{ T.leadersTitle }}</h2>

      <div v-if="loadingLeaders" class="text-shell-text text-sm">{{ T.loading }}</div>

      <div v-else-if="leaders.length === 0" class="text-shell-text text-sm">{{ T.noLeaders }}</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-shell-text border-b border-shell-border">
              <th class="pb-3 text-left font-medium w-12">{{ T.colRank }}</th>
              <th class="pb-3 text-left font-medium">{{ T.colMiner }}</th>
              <th class="pb-3 text-right font-medium">{{ T.colAgents }}</th>
              <th class="pb-3 text-right font-medium">{{ T.colTotal }}</th>
              <th class="pb-3 text-right font-medium">{{ T.colFirst }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(l, i) in leaders"
              :key="l.miner_name"
              class="border-b border-shell-border/40 hover:bg-shell-card/50 transition-colors"
            >
              <td class="py-3">
                <span v-if="i === 0" class="text-yellow-400 font-bold">🥇</span>
                <span v-else-if="i === 1" class="text-zinc-300 font-bold">🥈</span>
                <span v-else-if="i === 2" class="text-amber-600 font-bold">🥉</span>
                <span v-else class="text-shell-text">{{ i + 1 }}</span>
              </td>
              <td class="py-3 text-white font-medium">{{ l.miner_name || '—' }}</td>
              <td class="py-3 text-right text-shell-green font-semibold">{{ l.agents_breached }}</td>
              <td class="py-3 text-right text-shell-text">{{ l.total_breaches }}</td>
              <td class="py-3 text-right text-shell-text">{{ formatDate(l.first_breach_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
