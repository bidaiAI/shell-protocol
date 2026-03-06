<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getGlobalStats, type GlobalStats } from '../lib/api'

const stats = ref<GlobalStats | null>(null)

onMounted(async () => {
  try {
    stats.value = await getGlobalStats()
  }
  catch {
    // Stats are non-critical for landing
  }
})

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
      <p class="text-xl text-shell-text max-w-2xl mx-auto leading-relaxed">
        全球首个去中心化 AI 红队测试网络。
        通过发现 AI Agent 漏洞来挖矿赚取 $SHELL。
      </p>

      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="https://github.com/shell-protocol/miner-cli"
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
          <h3 class="font-semibold mb-2">连接 &amp; 挖矿</h3>
          <p class="text-sm text-shell-text leading-relaxed">
            连接你的 Solana 钱包并运行矿机 CLI。
            你的本地 LLM 会自动生成 Prompt Injection 攻击载荷。
          </p>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-shell-green text-3xl mb-3">02</div>
          <h3 class="font-semibold mb-2">攻击 AI Agent</h3>
          <p class="text-sm text-shell-text leading-relaxed">
            攻击载荷会在沙盒中测试目标 AI Agent。
            触发未授权操作即证明漏洞存在。
          </p>
        </div>
        <div class="bg-shell-card border border-shell-border rounded-lg p-6">
          <div class="text-shell-green text-3xl mb-3">03</div>
          <h3 class="font-semibold mb-2">赚取 $SHELL</h3>
          <p class="text-sm text-shell-text leading-relaxed">
            攻击成功即获得 $SHELL 积分。
            从 Scout 升级到 Hunter 再到 Apex，获得更高倍率。
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

    <!-- CTA -->
    <div class="text-center bg-shell-card border border-shell-green/20 rounded-lg p-8 glow-green">
      <h2 class="text-2xl font-bold mb-2">准备好攻破 AI 了吗？</h2>
      <p class="text-shell-text mb-6">安装矿机 CLI，今天就开始赚取 $SHELL。</p>
      <code class="bg-black text-shell-green px-4 py-2 rounded font-mono text-sm">
        npx @shell/miner start --wallet YOUR_WALLET
      </code>
    </div>
  </div>
</template>
