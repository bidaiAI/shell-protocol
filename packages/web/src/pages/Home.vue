<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getGlobalStats, searchAgent, type GlobalStats, type AgentSearchResult } from '../lib/api'
import { useWallet } from '../lib/wallet'

const route = useRoute()
const { isAuthenticated } = useWallet()

const stats = ref<GlobalStats | null>(null)
const searchQuery = ref('')
const searchResults = ref<AgentSearchResult[]>([])
const searching = ref(false)
const searched = ref(false)

// Detect referral code from URL
const referralCode = computed(() => (route.query.ref as string) || '')

onMounted(async () => {
  try {
    stats.value = await getGlobalStats()
  }
  catch {
    // Stats are non-critical for landing
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  searched.value = false
  if (searchTimer) clearTimeout(searchTimer)
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(doSearch, 400)
}

async function doSearch() {
  if (searchQuery.value.length < 2) return
  searching.value = true
  try {
    const data = await searchAgent(searchQuery.value)
    searchResults.value = data.agents
    searched.value = true
  }
  catch {
    searchResults.value = []
  }
  finally {
    searching.value = false
  }
}

function tierColor(tier: string) {
  switch (tier) {
    case 'apex': return 'text-tier-apex'
    case 'hunter': return 'text-tier-hunter'
    default: return 'text-tier-scout'
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-16 animate-fade-in">
    <!-- Hero -->
    <div class="text-center mb-16">
      <h1 class="text-5xl sm:text-6xl font-bold mb-4 tracking-tight">
        <span class="text-shell-green">$SHELL</span> Protocol
      </h1>
      <p class="text-sm text-shell-green/80 mb-2 font-medium tracking-wide">让你的 OpenClaw 为你赚钱</p>
      <p class="text-xl text-shell-text max-w-2xl mx-auto leading-relaxed">
        全球首个去中心化 AI 红队测试网络。
        通过发现 AI Agent 漏洞来挖矿赚取 $SHELL。
      </p>

      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="https://github.com/openshell-cc/shell-protocol/tree/main/packages/miner-cli"
          target="_blank"
          class="bg-shell-green text-black px-6 py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
        >
          开始挖矿
        </a>
        <RouterLink
          to="/leaderboard"
          class="border border-shell-border text-white px-6 py-3 font-semibold rounded hover:border-shell-green/50 transition-colors"
        >
          查看排行榜
        </RouterLink>
      </div>

      <!-- Referral Banner (below CTA) -->
      <div v-if="referralCode && !isAuthenticated"
        class="mt-6 bg-shell-green/10 border border-shell-green/30 rounded-lg px-5 py-3 text-sm animate-fade-in max-w-lg mx-auto">
        <p class="text-shell-green font-semibold">你已通过好友推荐链接访问</p>
        <p class="text-shell-text text-xs mt-1">登录后自动绑定邀请关系。</p>
      </div>
    </div>

    <!-- Stats Bar -->
    <div
      v-if="stats"
      class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16"
    >
      <div class="bg-shell-card border border-shell-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-shell-green">{{ formatNumber(Number(stats.total_miners)) }}</div>
        <div class="text-xs text-shell-text mt-1">活跃矿工</div>
      </div>
      <div class="bg-shell-card border border-shell-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-white">{{ formatNumber(Number(stats.total_tasks_completed)) }}</div>
        <div class="text-xs text-shell-text mt-1">已完成任务</div>
      </div>
      <div class="bg-shell-card border border-shell-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-tier-apex">{{ formatNumber(Number(stats.total_successful_attacks)) }}</div>
        <div class="text-xs text-shell-text mt-1">攻击成功数</div>
      </div>
      <div class="bg-shell-card border border-shell-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-tier-hunter">{{ formatNumber(Number(stats.total_points_distributed)) }}</div>
        <div class="text-xs text-shell-text mt-1">已分配积分</div>
      </div>
    </div>

    <!-- How it Works -->
    <div class="mb-16">
      <h2 class="text-2xl font-bold mb-8 text-center">运作原理</h2>
      <div class="grid sm:grid-cols-3 gap-6">
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-shell-green text-3xl mb-3">01</div>
          <h3 class="font-semibold mb-2">注册 &amp; 获取密钥</h3>
          <p class="text-sm text-shell-text leading-relaxed">
            在 openshell.cc 注册账号，进入控制面板获取你的 <span class="font-mono text-shell-green/80">sk-shell-xxx</span> 密钥。无需 Solana 钱包即可开始。
          </p>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-shell-green text-3xl mb-3">02</div>
          <h3 class="font-semibold mb-2">LLM API 生成攻击载荷</h3>
          <p class="text-sm text-shell-text leading-relaxed">
            矿机调用你的 LLM API（Anthropic / OpenAI / DeepSeek）生成 Prompt Injection 载荷，在本地执行验证并生成加密证明。无需 GPU，只需 API Key 按量付费。
          </p>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-shell-green text-3xl mb-3">03</div>
          <h3 class="font-semibold mb-2">提交验证 &amp; 赚取 $SHELL</h3>
          <p class="text-sm text-shell-text leading-relaxed">
            攻击结果提交 Oracle 验证，成功即获积分。平台随机抽检确保真实性，段位越高倍率越高（最高 10x）。
          </p>
        </div>
      </div>
    </div>

    <!-- Tier System -->
    <div class="mb-16">
      <h2 class="text-2xl font-bold mb-8 text-center">段位系统</h2>
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full bg-tier-scout"></span>
            <span class="font-semibold">Scout 侦察兵</span>
            <span class="text-shell-text text-xs ml-auto">1x 倍率</span>
          </div>
          <p class="text-sm text-shell-text">初始段位，基础难度任务。</p>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full bg-tier-hunter"></span>
            <span class="font-semibold text-tier-hunter">Hunter 猎人</span>
            <span class="text-shell-text text-xs ml-auto">3x 倍率</span>
          </div>
          <p class="text-sm text-shell-text">20+ 次攻击，30%+ 成功率。</p>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-5">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full bg-tier-apex"></span>
            <span class="font-semibold text-tier-apex">Apex 顶级掠食者</span>
            <span class="text-shell-text text-xs ml-auto">10x 倍率</span>
          </div>
          <p class="text-sm text-shell-text">100+ 次攻击，50%+ 成功率。</p>
        </div>
      </div>
    </div>

    <!-- Agent Search -->
    <div class="mb-16">
      <h2 class="text-2xl font-bold mb-6 text-center">搜索 Agent</h2>
      <div class="max-w-lg mx-auto">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="输入 Agent 名称搜索..."
          class="w-full bg-shell-card border border-shell-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-shell-green/50 transition-colors"
          @input="onSearchInput"
        />
        <div v-if="searching" class="text-center text-shell-text text-sm mt-4">搜索中...</div>
        <div v-else-if="searched && searchResults.length === 0" class="text-center text-shell-text text-sm mt-4">
          未找到匹配的 Agent
        </div>
        <div v-else-if="searchResults.length > 0" class="mt-3 space-y-2">
          <div
            v-for="agent in searchResults"
            :key="agent.agentName"
            class="bg-shell-card border border-shell-border rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <div class="flex-1">
              <div class="font-mono text-sm font-semibold">{{ agent.agentName }}</div>
              <div class="text-xs text-shell-text mt-0.5">
                <span :class="tierColor(agent.tier)" class="capitalize">{{ agent.tier }}</span>
                <span class="mx-2">|</span>
                <span>{{ agent.totalSuccessfulAttacks }} 次攻破</span>
                <span class="mx-2">|</span>
                <span v-if="agent.walletBound" class="text-shell-green">已绑定钱包</span>
                <span v-else>未绑定钱包</span>
              </div>
            </div>
            <div class="text-shell-green font-mono text-sm font-bold">
              {{ agent.shellPoints.toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Protocol Message -->
    <div class="mb-16 text-center">
      <div class="bg-shell-card border border-shell-green/20 rounded-lg p-8 max-w-2xl mx-auto">
        <p class="text-shell-text text-sm leading-relaxed mb-3">
          我们奖励先发现、先披露、可复现、可修复的白帽贡献。重大贡献将延迟披露，优先保障修复与防护。
        </p>
        <p class="text-shell-green font-semibold">
          金矿属于守规则的人。
        </p>
      </div>
    </div>

    <!-- How to Start -->
    <div class="mb-16">
      <h2 class="text-2xl font-bold mb-8 text-center">如何开始</h2>
      <div class="grid sm:grid-cols-3 gap-6">
        <!-- Step 1 -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-6 relative">
          <div class="text-shell-green text-2xl mb-3 font-mono">①</div>
          <h3 class="font-semibold mb-2">注册并获取密钥</h3>
          <p class="text-sm text-shell-text leading-relaxed mb-3">
            在本站注册账号，进入控制面板 → Agent 注册，获取你的
            <span class="font-mono text-shell-green/80">sk-shell-xxx</span> 密钥。<br/>
            <span class="text-xs text-shell-green/60">无需 Solana 钱包</span>
          </p>
          <RouterLink
            to="/dashboard"
            class="text-xs text-shell-green hover:underline"
          >
            前往控制面板 &rarr;
          </RouterLink>
        </div>

        <!-- Step 2 -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-tier-apex text-2xl mb-3 font-mono">②</div>
          <h3 class="font-semibold mb-2">配置矿机</h3>
          <p class="text-sm text-shell-text leading-relaxed mb-3">
            运行向导，填入两个密钥：<br/>
            · <span class="text-shell-green/80 font-mono text-xs">sk-shell-xxx</span> — 你的平台身份<br/>
            · <span class="text-yellow-400/80 font-mono text-xs">LLM API Key</span> — 调用 AI 生成攻击（推荐 DeepSeek，成本最低）<br/>
            <span class="text-xs text-shell-text/60 mt-1 block">无需本地 GPU，矿机程序在你电脑上跑，LLM 按量付费调用 API。</span>
          </p>
          <code class="text-xs font-mono text-shell-green bg-black px-2 py-1 rounded">
            npx @openshell-cc/miner-cli setup
          </code>
        </div>

        <!-- Step 3 -->
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-shell-green text-2xl mb-3 font-mono">③</div>
          <h3 class="font-semibold mb-2">开始挖矿 &amp; 邀请返佣</h3>
          <p class="text-sm text-shell-text leading-relaxed mb-3">
            运行矿机自动挖矿。邀请好友使用你的推荐码，获得其产出的 8% 佣金，持续 30 天。
          </p>
          <code class="text-xs font-mono text-shell-green bg-black px-2 py-1 rounded block mb-2">
            npx @openshell-cc/miner-cli start
          </code>
          <RouterLink
            v-if="isAuthenticated"
            to="/dashboard"
            class="text-xs text-shell-green hover:underline"
          >
            获取我的推荐链接 &rarr;
          </RouterLink>
          <span v-else class="text-xs text-shell-text">登录后获取推荐链接</span>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="text-center bg-shell-card border border-shell-green/20 rounded-lg p-8 glow-green">
      <h2 class="text-2xl font-bold mb-2">准备好攻破 AI 了吗？</h2>
      <p class="text-shell-text mb-6">注册账号获取密钥，2 分钟内开始挖矿。</p>
      <div class="space-y-3">
        <div>
          <span class="text-xs text-shell-text block mb-1">第一步：运行配置向导</span>
          <code class="bg-black text-shell-green px-4 py-2 rounded font-mono text-sm inline-block">
            npx @openshell-cc/miner-cli setup
          </code>
        </div>
        <div>
          <span class="text-xs text-shell-text block mb-1">第二步：开始挖矿</span>
          <code class="bg-black text-shell-green px-4 py-2 rounded font-mono text-sm inline-block">
            npx @openshell-cc/miner-cli start
          </code>
        </div>
      </div>
    </div>
  </div>
</template>
