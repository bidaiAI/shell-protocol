<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  adminListUsers, adminGrantMining, adminRevokeMining,
  adminGenerateInviteCodes, adminListInviteCodes,
  adminGetActiveMiners,
  type AdminUser, type AdminInviteCode, type ActiveMinersResponse, ApiError,
} from '../lib/api'

// ── Auth ──────────────────────────────────────────────────────
const secret = ref(sessionStorage.getItem('admin_secret') || '')
const secretInput = ref('')
const authError = ref('')
const isAuthenticated = computed(() => !!secret.value)

function login() {
  if (!secretInput.value.trim()) { authError.value = '请输入 Admin Secret'; return }
  secret.value = secretInput.value.trim()
  sessionStorage.setItem('admin_secret', secret.value)
  authError.value = ''
  loadUsers()
  loadInviteCodes()
}
function logout() {
  secret.value = ''
  sessionStorage.removeItem('admin_secret')
}

// ── Tab ──────────────────────────────────────────────────────
const activeTab = ref<'users' | 'invites'>('users')
const showActiveDetail = ref(false)

// ═══════════════════════════════════════════════════════════════
//  TAB 1: Users
// ═══════════════════════════════════════════════════════════════
const users = ref<AdminUser[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

// Filters
const filterStatus = ref<'all' | 'enabled' | 'disabled'>('all')
const searchQ = ref('')
const page = ref(0)
const PAGE_SIZE = 50

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))
// Server-side counts (accurate across all pages)
const totalAll = ref(0)
const enabledCount = ref(0)
const disabledCount = ref(0)

async function loadUsers(resetPage = false) {
  if (!secret.value) return
  if (resetPage) page.value = 0
  loading.value = true
  error.value = ''
  try {
    const res = await adminListUsers(secret.value, {
      status: filterStatus.value === 'all' ? undefined : filterStatus.value,
      q: searchQ.value.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
    })
    users.value = res.users
    total.value = res.total
    // Use server-side summary counts (accurate across all pages)
    if ('totalAll' in res) {
      totalAll.value = (res as any).totalAll
      enabledCount.value = (res as any).enabledTotal
      disabledCount.value = (res as any).disabledTotal
    } else {
      // Fallback: client-side count from loaded page
      totalAll.value = res.total
      enabledCount.value = users.value.filter(u => u.miningAccessEnabled).length
      disabledCount.value = users.value.filter(u => !u.miningAccessEnabled).length
    }
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 401 || (e instanceof ApiError && e.status === 403)) {
      authError.value = 'Secret 无效，请重新输入'
      secret.value = ''
      sessionStorage.removeItem('admin_secret')
    }
    else {
      error.value = e instanceof Error ? e.message : '加载失败'
    }
  }
  finally {
    loading.value = false
  }
}

// ── Active Miners (实时挖矿统计) ────────────────────────────
const activeMiners = ref<ActiveMinersResponse>({ total: 0, free: 0, selfLlm: 0, miners: [] })
let activeMinerTimer: ReturnType<typeof setInterval> | null = null

async function loadActiveMiners() {
  if (!secret.value) return
  try {
    activeMiners.value = await adminGetActiveMiners(secret.value)
  } catch { /* ignore */ }
}

onUnmounted(() => {
  if (activeMinerTimer) clearInterval(activeMinerTimer)
})

onMounted(() => {
  if (isAuthenticated.value) {
    loadUsers()
    loadInviteCodes()
    loadActiveMiners()
    // Auto-refresh active miners every 30 seconds
    activeMinerTimer = setInterval(loadActiveMiners, 30_000)
  }
})

// ── User Actions ────────────────────────────────────────────
const actingId = ref<string | null>(null)
const actionMsg = ref('')

async function grant(user: AdminUser) {
  actingId.value = user.id
  actionMsg.value = ''
  try {
    const res = await adminGrantMining(secret.value, user.id)
    actionMsg.value = res.message
    user.miningAccessEnabled = true
    user.miningAccessGrantedAt = new Date().toISOString()
  }
  catch (e) { actionMsg.value = e instanceof Error ? e.message : '操作失败' }
  finally { actingId.value = null }
}

async function revoke(user: AdminUser) {
  actingId.value = user.id
  actionMsg.value = ''
  try {
    const res = await adminRevokeMining(secret.value, user.id)
    actionMsg.value = res.message
    user.miningAccessEnabled = false
    user.miningAccessGrantedAt = null
  }
  catch (e) { actionMsg.value = e instanceof Error ? e.message : '操作失败' }
  finally { actingId.value = null }
}

// ═══════════════════════════════════════════════════════════════
//  TAB 2: Invite Codes
// ═══════════════════════════════════════════════════════════════
const inviteCodes = ref<AdminInviteCode[]>([])
const inviteLoading = ref(false)
const inviteError = ref('')
const inviteMsg = ref('')

// Generate form
const genCount = ref(10)
const genExpireDays = ref(7)
const genNote = ref('')
const generating = ref(false)
const generatedCodes = ref<string[]>([])
const copiedAll = ref(false)

// Stats
const inviteTotal = computed(() => inviteCodes.value.length)
const inviteUsed = computed(() => inviteCodes.value.filter(c => c.usedBy).length)
const inviteAvailable = computed(() => inviteCodes.value.filter(c => !c.usedBy && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length)
const inviteExpired = computed(() => inviteCodes.value.filter(c => !c.usedBy && c.expiresAt && new Date(c.expiresAt) <= new Date()).length)

async function loadInviteCodes() {
  if (!secret.value) return
  inviteLoading.value = true
  inviteError.value = ''
  try {
    const res = await adminListInviteCodes(secret.value)
    inviteCodes.value = res.codes
  }
  catch (e) {
    inviteError.value = e instanceof Error ? e.message : '加载邀请码失败'
  }
  finally {
    inviteLoading.value = false
  }
}

async function generateCodes() {
  generating.value = true
  inviteMsg.value = ''
  generatedCodes.value = []
  copiedAll.value = false
  try {
    const res = await adminGenerateInviteCodes(secret.value, {
      count: genCount.value,
      expiresInDays: genExpireDays.value || undefined,
      note: genNote.value.trim() || undefined,
    })
    generatedCodes.value = res.codes
    inviteMsg.value = `成功生成 ${res.count} 个邀请码`
    // Reload list
    await loadInviteCodes()
  }
  catch (e) {
    inviteError.value = e instanceof Error ? e.message : '生成邀请码失败'
  }
  finally {
    generating.value = false
  }
}

async function copyAllCodes() {
  const text = generatedCodes.value.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copiedAll.value = true
    setTimeout(() => { copiedAll.value = false }, 2000)
  }
  catch { /* fallback: select text */ }
}

async function copySingleCode(code: string) {
  try { await navigator.clipboard.writeText(code) }
  catch { /* ignore */ }
}

function codeStatus(code: AdminInviteCode): 'used' | 'expired' | 'available' {
  if (code.usedBy) return 'used'
  if (code.expiresAt && new Date(code.expiresAt) <= new Date()) return 'expired'
  return 'available'
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
function authLabel(method: string) {
  const m: Record<string, string> = { email: '邮箱', wallet: '钱包', apikey: 'API Key' }
  return m[method] || method
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadUsers(true), 400)
}
</script>

<template>
  <div class="min-h-screen bg-black text-white px-4 py-8 max-w-6xl mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-shell-green font-mono">Admin · 管理面板</h1>
        <p class="text-xs text-shell-text/50 mt-0.5">挖矿白名单 & 邀请码管理 — 本页面不公开</p>
      </div>
      <button v-if="isAuthenticated" @click="logout"
        class="text-xs text-shell-text/40 hover:text-red-400 transition-colors border border-shell-border px-3 py-1 rounded">
        退出登录
      </button>
    </div>

    <!-- ── LOGIN ── -->
    <div v-if="!isAuthenticated" class="max-w-sm mx-auto mt-20">
      <div class="border border-shell-border rounded-xl p-6 bg-shell-card">
        <h2 class="text-sm font-semibold text-white mb-4 text-center">Admin 登录</h2>
        <label class="block mb-3">
          <span class="text-xs text-shell-text block mb-1">ADMIN_SECRET</span>
          <input
            v-model="secretInput"
            type="password"
            placeholder="输入 Railway 环境变量 ADMIN_SECRET"
            class="w-full bg-black border border-shell-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-shell-green/50"
            @keydown.enter="login"
          />
        </label>
        <button
          @click="login"
          class="w-full bg-shell-green text-black py-2 text-sm font-bold rounded hover:bg-shell-green-dim transition-colors"
        >进入管理面板</button>
        <p v-if="authError" class="text-xs text-red-400 mt-2 text-center">{{ authError }}</p>
      </div>
    </div>

    <!-- ── MAIN PANEL ── -->
    <template v-else>

      <!-- Tab switcher -->
      <div class="flex border border-shell-border rounded-lg overflow-hidden text-sm font-mono mb-6 w-fit">
        <button
          @click="activeTab = 'users'"
          class="px-5 py-2 transition-colors"
          :class="activeTab === 'users' ? 'bg-shell-green text-black font-bold' : 'text-shell-text/60 hover:text-white'"
        >用户管理</button>
        <button
          @click="activeTab = 'invites'; loadInviteCodes()"
          class="px-5 py-2 transition-colors"
          :class="activeTab === 'invites' ? 'bg-shell-green text-black font-bold' : 'text-shell-text/60 hover:text-white'"
        >邀请码</button>
      </div>

      <!-- ═══════════════════════════════════════════════════════ -->
      <!--  TAB: Users                                           -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'users'">

        <!-- Stats bar -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          <div class="bg-shell-card border border-shell-border rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-white font-mono">{{ totalAll || total }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">总注册</div>
          </div>
          <div class="bg-shell-card border border-shell-green/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-shell-green font-mono">{{ enabledCount }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">已开通</div>
          </div>
          <div class="bg-shell-card border border-amber-400/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-amber-300 font-mono">{{ disabledCount }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">等待名单</div>
          </div>
          <!-- Real-time mining stats -->
          <div class="bg-shell-card border border-cyan-400/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-cyan-400 font-mono">{{ activeMiners.total }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">⛏️ 在线矿工</div>
          </div>
          <div class="bg-shell-card border border-shell-border rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-400 font-mono">{{ activeMiners.free }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">🆓 免费模式</div>
          </div>
          <div class="bg-shell-card border border-purple-400/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-purple-400 font-mono">{{ activeMiners.selfLlm }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">🤖 自带LLM</div>
          </div>
        </div>

        <!-- Active miners detail (collapsible) -->
        <div v-if="activeMiners.total > 0" class="mb-6">
          <button @click="showActiveDetail = !showActiveDetail" class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            {{ showActiveDetail ? '▼' : '▶' }} 在线矿工详情 ({{ activeMiners.total }})
            <span class="text-shell-text/30 ml-2">每30秒刷新</span>
          </button>
          <div v-if="showActiveDetail" class="mt-2 bg-shell-card border border-shell-border rounded-lg overflow-hidden">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-shell-border text-shell-text/50">
                  <th class="px-3 py-2 text-left">矿工</th>
                  <th class="px-3 py-2 text-left">模式</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in activeMiners.miners" :key="m.userId" class="border-b border-shell-border/30 hover:bg-white/5">
                  <td class="px-3 py-1.5 font-mono">{{ m.agentName || m.email || m.userId.slice(0,8) }}</td>
                  <td class="px-3 py-1.5">
                    <span :class="m.mode === 'self_llm' ? 'text-purple-400' : 'text-blue-400'">
                      {{ m.mode === 'self_llm' ? '🤖 self_llm' : '🆓 free' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Action message -->
        <div v-if="actionMsg" class="mb-4 text-xs text-shell-green bg-shell-green/10 border border-shell-green/20 rounded px-3 py-2">
          {{ actionMsg }}
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-2 mb-4">
          <!-- Status tabs -->
          <div class="flex border border-shell-border rounded-lg overflow-hidden text-xs font-mono">
            <button
              v-for="opt in [['all','全部'],['disabled','等待中'],['enabled','已开通']] as [string,string][]"
              :key="opt[0]"
              @click="filterStatus = opt[0] as any; loadUsers(true)"
              class="px-3 py-1.5 transition-colors"
              :class="filterStatus === opt[0]
                ? 'bg-shell-green text-black font-bold'
                : 'text-shell-text/60 hover:text-white'"
            >{{ opt[1] }}</button>
          </div>

          <!-- Search -->
          <input
            v-model="searchQ"
            @input="onSearchInput"
            type="text"
            placeholder="搜索 邮箱 / Agent名称 / userId…"
            class="flex-1 min-w-48 bg-black border border-shell-border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-shell-green/50"
          />

          <button @click="loadUsers(true)"
            class="text-xs text-shell-text/60 hover:text-shell-green border border-shell-border px-3 py-1.5 rounded-lg transition-colors">
            刷新
          </button>
        </div>

        <!-- Error -->
        <div v-if="error" class="mb-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
          {{ error }}
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center text-shell-text/30 py-12 font-mono text-sm">加载中...</div>

        <!-- Empty -->
        <div v-else-if="users.length === 0"
          class="text-center text-shell-text/25 py-16 font-mono text-sm border border-dashed border-shell-border rounded-xl">
          暂无注册用户
        </div>

        <!-- Table -->
        <div v-else class="border border-shell-border rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-shell-border bg-shell-card/50 text-shell-text/40 text-left">
                <th class="px-3 py-2.5">用户</th>
                <th class="px-3 py-2.5 hidden sm:table-cell">注册方式</th>
                <th class="px-3 py-2.5 hidden md:table-cell">段位 / 积分</th>
                <th class="px-3 py-2.5">挖矿状态</th>
                <th class="px-3 py-2.5 hidden sm:table-cell">注册时间</th>
                <th class="px-3 py-2.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in users" :key="u.id"
                class="border-b border-shell-border/40 hover:bg-shell-card/30 transition-colors"
                :class="u.isBanned ? 'opacity-40' : ''"
              >
                <!-- User identity -->
                <td class="px-3 py-2.5">
                  <div class="font-mono text-white text-xs truncate max-w-[180px]">
                    {{ u.email || u.agentName || u.id.slice(0, 8) + '…' }}
                  </div>
                  <div v-if="u.agentName && u.email" class="text-shell-text/40 text-xs">{{ u.agentName }}</div>
                  <div class="text-shell-text/25 text-xs font-mono">{{ u.id.slice(0, 8) }}…</div>
                </td>

                <!-- Auth method -->
                <td class="px-3 py-2.5 hidden sm:table-cell">
                  <span class="font-mono text-shell-text/50">{{ authLabel(u.authMethod) }}</span>
                </td>

                <!-- Tier / Points -->
                <td class="px-3 py-2.5 hidden md:table-cell">
                  <span class="capitalize" :class="{
                    'text-tier-apex': u.tier === 'apex',
                    'text-tier-hunter': u.tier === 'hunter',
                    'text-tier-scout': u.tier === 'scout',
                  }">{{ u.tier }}</span>
                  <span class="text-shell-text/30 ml-1">/ {{ u.shellPoints }}</span>
                </td>

                <!-- Mining status -->
                <td class="px-3 py-2.5">
                  <div v-if="u.miningAccessEnabled" class="text-shell-green font-mono">
                    已开通
                    <div v-if="u.miningAccessGrantedAt" class="text-shell-text/30 text-xs">{{ formatDate(u.miningAccessGrantedAt) }}</div>
                  </div>
                  <div v-else class="text-amber-400/60 font-mono">等待中</div>
                  <div v-if="u.isBanned" class="text-red-400/60 text-xs">已封禁</div>
                  <div v-if="u.isFrozen" class="text-yellow-400/60 text-xs">已冻结</div>
                </td>

                <!-- Register time -->
                <td class="px-3 py-2.5 hidden sm:table-cell text-shell-text/40">
                  {{ formatDate(u.createdAt) }}
                </td>

                <!-- Actions -->
                <td class="px-3 py-2.5 text-right">
                  <button
                    v-if="!u.miningAccessEnabled"
                    :disabled="actingId === u.id"
                    @click="grant(u)"
                    class="text-xs bg-shell-green text-black px-2.5 py-1 rounded font-semibold hover:bg-shell-green-dim transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {{ actingId === u.id ? '…' : '开通' }}
                  </button>
                  <button
                    v-else
                    :disabled="actingId === u.id"
                    @click="revoke(u)"
                    class="text-xs border border-red-400/30 text-red-400/70 px-2.5 py-1 rounded hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {{ actingId === u.id ? '…' : '撤销' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 text-xs text-shell-text/40">
          <span>第 {{ page + 1 }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
          <div class="flex gap-2">
            <button
              :disabled="page === 0"
              @click="page--; loadUsers()"
              class="border border-shell-border px-3 py-1 rounded hover:border-shell-green/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >上一页</button>
            <button
              :disabled="page >= totalPages - 1"
              @click="page++; loadUsers()"
              class="border border-shell-border px-3 py-1 rounded hover:border-shell-green/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >下一页</button>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════ -->
      <!--  TAB: Invite Codes                                    -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'invites'">

        <!-- Stats bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div class="bg-shell-card border border-shell-border rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-white font-mono">{{ inviteTotal }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">总生成</div>
          </div>
          <div class="bg-shell-card border border-shell-green/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-shell-green font-mono">{{ inviteAvailable }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">可用</div>
          </div>
          <div class="bg-shell-card border border-cyan-400/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-cyan-300 font-mono">{{ inviteUsed }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">已使用</div>
          </div>
          <div class="bg-shell-card border border-amber-400/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-amber-300 font-mono">{{ inviteExpired }}</div>
            <div class="text-xs text-shell-text/50 mt-0.5">已过期</div>
          </div>
        </div>

        <!-- Generate form -->
        <div class="bg-shell-card border border-shell-border rounded-xl p-4 mb-6">
          <h3 class="text-sm font-semibold text-white mb-3">批量生成邀请码</h3>
          <div class="flex flex-wrap gap-3 items-end">
            <label class="block">
              <span class="text-xs text-shell-text/50 block mb-1">数量</span>
              <input
                v-model.number="genCount"
                type="number" min="1" max="100"
                class="w-20 bg-black border border-shell-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-shell-green/50"
              />
            </label>
            <label class="block">
              <span class="text-xs text-shell-text/50 block mb-1">有效期 (天)</span>
              <input
                v-model.number="genExpireDays"
                type="number" min="0" max="365"
                placeholder="0 = 永不过期"
                class="w-28 bg-black border border-shell-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-shell-green/50"
              />
            </label>
            <label class="block flex-1 min-w-36">
              <span class="text-xs text-shell-text/50 block mb-1">备注 (可选)</span>
              <input
                v-model="genNote"
                type="text"
                placeholder="例如：第一批内测码"
                class="w-full bg-black border border-shell-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-shell-green/50"
              />
            </label>
            <button
              :disabled="generating"
              @click="generateCodes"
              class="bg-shell-green text-black px-4 py-1.5 text-sm font-bold rounded hover:bg-shell-green-dim transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {{ generating ? '生成中…' : '生成' }}
            </button>
          </div>

          <!-- Generated codes result -->
          <div v-if="generatedCodes.length > 0" class="mt-4 border border-shell-green/20 rounded-lg p-3 bg-shell-green/5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-shell-green font-semibold">{{ inviteMsg }}</span>
              <button
                @click="copyAllCodes"
                class="text-xs border border-shell-green/30 text-shell-green px-2 py-0.5 rounded hover:bg-shell-green/10 transition-colors"
              >{{ copiedAll ? '已复制' : '复制全部' }}</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
              <button
                v-for="code in generatedCodes" :key="code"
                @click="copySingleCode(code)"
                class="bg-black border border-shell-border rounded px-2 py-1 text-xs font-mono text-white hover:border-shell-green/50 hover:text-shell-green transition-colors text-center"
                title="点击复制"
              >{{ code }}</button>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="inviteError" class="mb-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
          {{ inviteError }}
        </div>

        <!-- Loading -->
        <div v-if="inviteLoading" class="text-center text-shell-text/30 py-12 font-mono text-sm">加载中...</div>

        <!-- Empty -->
        <div v-else-if="inviteCodes.length === 0"
          class="text-center text-shell-text/25 py-16 font-mono text-sm border border-dashed border-shell-border rounded-xl">
          暂无邀请码 — 点击上方「生成」按钮创建
        </div>

        <!-- Invite Code Table -->
        <div v-else class="border border-shell-border rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-shell-border bg-shell-card/50 text-shell-text/40 text-left">
                <th class="px-3 py-2.5">邀请码</th>
                <th class="px-3 py-2.5">状态</th>
                <th class="px-3 py-2.5 hidden sm:table-cell">使用者</th>
                <th class="px-3 py-2.5 hidden md:table-cell">备注</th>
                <th class="px-3 py-2.5 hidden sm:table-cell">创建时间</th>
                <th class="px-3 py-2.5 hidden md:table-cell">过期时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in inviteCodes" :key="c.id"
                class="border-b border-shell-border/40 hover:bg-shell-card/30 transition-colors"
              >
                <!-- Code -->
                <td class="px-3 py-2.5">
                  <button
                    @click="copySingleCode(c.code)"
                    class="font-mono text-white hover:text-shell-green transition-colors"
                    title="点击复制"
                  >{{ c.code }}</button>
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5">
                  <span v-if="codeStatus(c) === 'used'" class="text-cyan-300 font-mono">已使用</span>
                  <span v-else-if="codeStatus(c) === 'expired'" class="text-amber-400/60 font-mono">已过期</span>
                  <span v-else class="text-shell-green font-mono">可用</span>
                </td>

                <!-- Used by -->
                <td class="px-3 py-2.5 hidden sm:table-cell">
                  <template v-if="c.usedBy">
                    <div class="font-mono text-white text-xs truncate max-w-[140px]">
                      {{ c.usedByAgentName || c.usedByEmail || c.usedBy.slice(0, 8) + '…' }}
                    </div>
                    <div class="text-shell-text/30 text-xs">{{ formatDate(c.usedAt) }}</div>
                  </template>
                  <span v-else class="text-shell-text/25">—</span>
                </td>

                <!-- Note -->
                <td class="px-3 py-2.5 hidden md:table-cell text-shell-text/40 truncate max-w-[120px]">
                  {{ c.note || '—' }}
                </td>

                <!-- Created at -->
                <td class="px-3 py-2.5 hidden sm:table-cell text-shell-text/40">
                  {{ formatDate(c.createdAt) }}
                </td>

                <!-- Expires at -->
                <td class="px-3 py-2.5 hidden md:table-cell text-shell-text/40">
                  {{ c.expiresAt ? formatDate(c.expiresAt) : '永不' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Refresh button -->
        <div class="mt-4 text-right">
          <button @click="loadInviteCodes"
            class="text-xs text-shell-text/60 hover:text-shell-green border border-shell-border px-3 py-1.5 rounded-lg transition-colors">
            刷新列表
          </button>
        </div>
      </div>

    </template>
  </div>
</template>
