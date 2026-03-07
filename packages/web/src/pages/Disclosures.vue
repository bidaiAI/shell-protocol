<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDisclosures, type DisclosureEntry } from '../lib/api'

const disclosures = ref<DisclosureEntry[]>([])
const loading = ref(true)

// ── Hardcoded featured entry: OpenClaw Red Team Playbook (白帽凭证示例) ──
const FEATURED: DisclosureEntry = {
  id: 'SHELL-2025-001',
  anonymousId: 'bidaiAI',
  displayName: 'bidaiAI',
  severity: 'critical',
  remediationStatus: 'patched',
  publicSummary: '针对 OpenClaw AI Agent 框架发现并披露三类高危漏洞：(1) Context Poisoning — 通过外部数据注入伪造系统指令，导致 Agent 静默崩溃 (DoS)；(2) Westworld 盲区 — Gemini 3.1 Provider ID 不匹配致所有图像任务崩溃；(3) Shell Injection — 通过 Prompt Injection 链式触发 `spawnSync(shell:true)` 实现 RCE，可窃取 PRIVATE_KEY 并清空钱包。',
  rewardPoints: 50000,
  rewardTier: 'apex',
  confirmedAt: '2025-06-01T00:00:00Z',
  disclosedAt: '2025-06-15T00:00:00Z',
  proofLinks: [
    'https://github.com/openclaw/openclaw/issues/38074',
    'https://github.com/openclaw/openclaw/issues/38384',
    'https://github.com/openclaw/openclaw/pull/38390',
    'https://github.com/openclaw/openclaw/pull/38416',
    'https://github.com/openclaw/openclaw/pull/38555',
  ],
  targetSystem: 'OpenClaw v1.x',
  attackTypes: ['Context Poisoning', 'DoS', 'Shell Injection (RCE)', 'Prompt Injection'],
  isFeatured: true,
}

onMounted(async () => {
  try {
    const data = await getDisclosures()
    disclosures.value = data.contributions || []
  }
  catch {
    // non-critical
  }
  finally {
    loading.value = false
  }
})

const severityColor: Record<string, string> = {
  critical: 'text-red-400 border-red-400/30 bg-red-400/5',
  high: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  low: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
}

const severityLabel: Record<string, string> = {
  critical: '严重 CRITICAL',
  high: '高危 HIGH',
  medium: '中危 MEDIUM',
  low: '低危 LOW',
}

const remediationLabel: Record<string, string> = {
  patched: '✅ 已修复',
  in_progress: '🔧 修复中',
  unpatched: '⚠️ 未修复',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="min-h-screen bg-black text-white px-4 py-8 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-shell-green font-mono">
        漏洞公示 · Security Disclosures
      </h1>
      <p class="text-shell-text text-sm mt-2">
        所有通过 $SHELL 平台披露的 AI Agent 安全漏洞均在此公开。白帽研究员完成 14 天披露窗口后自动上榜。
      </p>
      <div class="mt-3 flex items-center gap-4 text-xs text-shell-text/60">
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-red-400"></span> 严重
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-orange-400"></span> 高危
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-yellow-400"></span> 中危
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-blue-400"></span> 低危
        </span>
      </div>
    </div>

    <!-- Featured Entry (OpenClaw White Hat) -->
    <div class="mb-6">
      <div class="text-xs text-shell-green/50 font-mono mb-2 flex items-center gap-2">
        <span class="border border-shell-green/30 px-2 py-0.5 rounded">★ 平台创始人示例</span>
        <span>验证该平台评分机制</span>
      </div>
      <div class="border border-shell-green/40 rounded-lg bg-shell-green/5 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="font-mono text-shell-green font-bold text-sm">{{ FEATURED.id }}</span>
            <span :class="['text-xs px-2 py-0.5 border rounded font-mono', severityColor[FEATURED.severity]]">
              {{ severityLabel[FEATURED.severity] }}
            </span>
            <span class="text-xs text-shell-green/60 border border-shell-green/20 px-2 py-0.5 rounded">
              {{ remediationLabel[FEATURED.remediationStatus] }}
            </span>
          </div>
          <div class="text-right text-xs text-shell-text/60">
            <div>白帽：<span class="text-white font-mono">{{ FEATURED.displayName }}</span></div>
            <div>披露日：{{ formatDate(FEATURED.disclosedAt) }}</div>
          </div>
        </div>

        <div class="mt-3">
          <div class="text-xs text-shell-text/50 mb-1">目标系统</div>
          <div class="text-sm text-white font-mono">{{ FEATURED.targetSystem }}</div>
        </div>

        <div class="mt-3">
          <div class="text-xs text-shell-text/50 mb-1">攻击类型</div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="t in FEATURED.attackTypes" :key="t"
              class="text-xs bg-shell-green/10 text-shell-green px-2 py-0.5 rounded font-mono"
            >
              {{ t }}
            </span>
          </div>
        </div>

        <div class="mt-3">
          <div class="text-xs text-shell-text/50 mb-1">漏洞摘要</div>
          <p class="text-sm text-shell-text leading-relaxed">{{ FEATURED.publicSummary }}</p>
        </div>

        <div class="mt-4">
          <div class="text-xs text-shell-text/50 mb-2">白帽凭证（GitHub Issues / PRs）</div>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="link in FEATURED.proofLinks" :key="link"
              :href="link"
              target="_blank"
              class="text-xs text-shell-green/70 hover:text-shell-green font-mono transition-colors underline underline-offset-2"
            >
              {{ link.replace('https://github.com/openclaw/openclaw/', '') }}
            </a>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between text-xs">
          <div class="text-shell-text/50">
            段位奖励：<span class="text-shell-green font-mono font-bold">{{ FEATURED.rewardPoints.toLocaleString() }} pts</span>
            <span class="ml-2 text-orange-400/80 uppercase">{{ FEATURED.rewardTier }}</span>
          </div>
          <div class="text-shell-text/40 italic">
            ⚠ 仅展示技术摘要，不含私钥或钱包信息
          </div>
        </div>
      </div>
    </div>

    <!-- Platform disclosures from DB -->
    <div>
      <h2 class="text-sm font-mono text-shell-text/60 mb-4 flex items-center gap-2">
        <span class="border-t border-shell-border flex-1"></span>
        最新矿工发现（已披露）
        <span class="border-t border-shell-border flex-1"></span>
      </h2>

      <div v-if="loading" class="text-center text-shell-text/40 py-12 font-mono text-sm">
        加载中...
      </div>

      <div v-else-if="disclosures.length === 0" class="text-center text-shell-text/30 py-12 font-mono text-sm">
        暂无矿工发现的漏洞披露<br>
        <span class="text-xs mt-1 block">成为第一个发现并提交 AI Agent 漏洞的矿工</span>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="d in disclosures" :key="d.anonymousId"
          class="border border-shell-border rounded-lg p-4 hover:border-shell-green/30 transition-colors"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs text-shell-text/40">{{ d.anonymousId }}</span>
              <span :class="['text-xs px-2 py-0.5 border rounded font-mono', severityColor[d.severity]]">
                {{ severityLabel[d.severity] }}
              </span>
              <span v-if="d.remediationStatus" class="text-xs text-shell-text/50">
                {{ remediationLabel[d.remediationStatus] }}
              </span>
            </div>
            <div class="text-right text-xs text-shell-text/40">
              <span class="text-white/60">{{ d.displayName }}</span>
              <span v-if="d.disclosedAt" class="ml-2">{{ formatDate(d.disclosedAt) }}</span>
            </div>
          </div>

          <p v-if="d.publicSummary" class="mt-2 text-sm text-shell-text/70 leading-relaxed">
            {{ d.publicSummary }}
          </p>

          <div class="mt-2 flex items-center gap-3 text-xs text-shell-text/40">
            <span v-if="d.rewardPoints">
              奖励：<span class="text-shell-green font-mono">{{ d.rewardPoints.toLocaleString() }} pts</span>
            </span>
            <span v-if="d.rewardTier" class="uppercase text-orange-400/60">{{ d.rewardTier }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer note -->
    <div class="mt-10 border-t border-shell-border pt-6 text-xs text-shell-text/30 text-center space-y-1">
      <p>所有披露均经过 14 天修复窗口后公开。平台不承担第三方的任何损失责任。</p>
      <p>想提交漏洞？<a href="/dashboard" class="text-shell-green/50 hover:text-shell-green transition-colors">登录控制面板</a>提交白帽报告。</p>
    </div>
  </div>
</template>
