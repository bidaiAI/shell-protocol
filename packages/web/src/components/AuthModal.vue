<script setup lang="ts">
import { ref } from 'vue'
import { useWallet } from '../lib/wallet'
import { setToken, getMyStats, resendVerificationEmail, forgotPasswordRequest } from '../lib/api'

const emit = defineEmits<{ close: [] }>()
const { connect, loginEmail, registerEmailUser } = useWallet()

const activeTab = ref<'wallet' | 'email' | 'apikey'>('email')
const emailInput = ref('')
const passwordInput = ref('')
const apiKeyInput = ref('')
const isRegister = ref(true)
const loading = ref(false)
const error = ref('')
const success = ref('')
const showForgotPassword = ref(false)
const showResendVerify = ref(false)
const forgotEmail = ref('')

// Extract referral from URL
const params = new URLSearchParams(window.location.search)
const referralCode = params.get('ref') || undefined

async function handleWallet() {
  loading.value = true
  error.value = ''
  try {
    await connect()
    emit('close')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '连接失败'
  }
  finally {
    loading.value = false
  }
}

async function handleEmail() {
  if (!emailInput.value || !passwordInput.value) {
    error.value = '请填写邮箱和密码'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''
  showResendVerify.value = false

  try {
    if (isRegister.value) {
      const result = await registerEmailUser(emailInput.value, passwordInput.value, referralCode)
      success.value = result.message
    }
    else {
      await loginEmail(emailInput.value, passwordInput.value)
      emit('close')
    }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : '操作失败'
    error.value = msg
    // Show resend button if email not verified
    if (msg.toLowerCase().includes('not verified') || msg.includes('未验证') || msg.includes('verification')) {
      showResendVerify.value = true
      forgotEmail.value = emailInput.value
    }
  }
  finally {
    loading.value = false
  }
}

async function handleResendVerification() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await resendVerificationEmail(forgotEmail.value || emailInput.value)
    success.value = result.message
    showResendVerify.value = false
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '发送失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  const email = forgotEmail.value || emailInput.value
  if (!email) {
    error.value = '请输入邮箱地址'
    return
  }
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await forgotPasswordRequest(email)
    success.value = result.message
    showForgotPassword.value = false
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '发送失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

// Known third-party API key prefixes — reject immediately with specific warning
const THIRD_PARTY_PREFIXES: [string, string][] = [
  ['sk-ant-', 'Anthropic'],
  ['sk-proj-', 'OpenAI'],
  ['sk-or-', 'OpenRouter'],
  ['gsk_', 'Groq'],
  ['xai-', 'xAI'],
  ['AIzaSy', 'Google'],
]

async function handleApiKey() {
  const key = apiKeyInput.value.trim()

  // Detect and block third-party keys with clear warning
  for (const [prefix, provider] of THIRD_PARTY_PREFIXES) {
    if (key.startsWith(prefix)) {
      error.value = `这是 ${provider} 的密钥，请勿在此输入！$SHELL 密钥以 sk-shell- 开头，在注册矿机时自动生成。`
      apiKeyInput.value = ''
      return
    }
  }

  if (!key.startsWith('sk-shell-')) {
    error.value = '格式错误 — $SHELL 密钥以 sk-shell- 开头，请检查是否粘贴正确'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Validate key against server before marking as authenticated
    setToken(key)
    await getMyStats() // throws ApiError if key is invalid or expired
    const { useWallet: getWallet } = await import('../lib/wallet')
    const { loginWithToken } = getWallet()
    loginWithToken(key)
    emit('close')
  }
  catch (err) {
    setToken(null) // roll back — don't leave an invalid token set
    error.value = err instanceof Error && err.message
      ? `密钥无效或已过期：${err.message}`
      : '密钥无效或已过期'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-shell-card border border-shell-border rounded-lg w-full max-w-md mx-4 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-shell-border">
        <h2 class="text-lg font-bold">登录 / 注册</h2>
        <button class="text-shell-text hover:text-white text-xl" @click="emit('close')">&times;</button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-shell-border">
        <button
          v-for="tab in [
            { key: 'email' as const, label: '邮箱' },
            { key: 'wallet' as const, label: 'Solana 钱包' },
            { key: 'apikey' as const, label: '$SHELL 密钥' },
          ]"
          :key="tab.key"
          class="flex-1 py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'text-shell-green border-b-2 border-shell-green' : 'text-shell-text hover:text-white'"
          @click="activeTab = tab.key; error = ''; success = ''; showForgotPassword = false; showResendVerify = false"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Body -->
      <div class="px-5 py-5">
        <!-- Wallet Tab -->
        <div v-if="activeTab === 'wallet'">
          <p class="text-sm text-shell-text mb-4">连接 Phantom 钱包进行签名登录。</p>
          <p class="text-xs text-yellow-400/80 mb-4">
            如果你已经有邮箱账号或 `sk-shell` 账号，请先登录，再到控制面板里绑定钱包；不要直接新建钱包登录。
          </p>
          <button
            class="w-full bg-shell-green text-black py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
            :disabled="loading"
            @click="handleWallet"
          >
            {{ loading ? '连接中...' : '连接 Phantom 钱包' }}
          </button>
          <p class="text-xs text-shell-text mt-3">已有钱包账号？直接钱包登录后可在控制面板绑定邮箱。</p>
        </div>

        <!-- Email Tab -->
        <div v-if="activeTab === 'email'">
          <!-- Forgot Password form -->
          <div v-if="showForgotPassword" class="space-y-3">
            <p class="text-sm text-shell-text">输入你的注册邮箱，我们会发送密码重置链接。</p>
            <input
              v-model="forgotEmail"
              type="email"
              placeholder="邮箱地址"
              class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-shell-green/50"
              @keyup.enter="handleForgotPassword"
            />
            <button
              class="w-full bg-shell-green text-black py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
              :disabled="loading"
              @click="handleForgotPassword"
            >
              {{ loading ? '发送中...' : '发送重置链接' }}
            </button>
            <div v-if="success" class="text-sm text-shell-green bg-shell-green/10 rounded px-3 py-2">
              {{ success }}
            </div>
            <div v-if="error" class="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">
              {{ error }}
            </div>
            <button
              class="w-full text-sm text-shell-text hover:text-white transition-colors py-1"
              @click="showForgotPassword = false; error = ''; success = ''"
            >
              ← 返回登录
            </button>
          </div>

          <!-- Normal login/register form -->
          <div v-else>
            <div class="flex gap-2 mb-4">
              <button
                class="flex-1 py-1.5 text-xs font-medium rounded transition-colors"
                :class="isRegister ? 'bg-shell-green/15 text-shell-green' : 'text-shell-text hover:text-white'"
                @click="isRegister = true; error = ''; success = ''; showResendVerify = false"
              >
                注册
              </button>
              <button
                class="flex-1 py-1.5 text-xs font-medium rounded transition-colors"
                :class="!isRegister ? 'bg-shell-green/15 text-shell-green' : 'text-shell-text hover:text-white'"
                @click="isRegister = false; error = ''; success = ''; showResendVerify = false"
              >
                登录
              </button>
            </div>

            <input
              v-model="emailInput"
              type="email"
              placeholder="邮箱地址"
              class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-shell-green/50"
            />
            <input
              v-model="passwordInput"
              type="password"
              :placeholder="isRegister ? '密码（至少 8 位）' : '密码'"
              class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-shell-green/50"
              @keyup.enter="handleEmail"
            />

            <button
              class="w-full bg-shell-green text-black py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
              :disabled="loading"
              @click="handleEmail"
            >
              {{ loading ? '处理中...' : isRegister ? '注册' : '登录' }}
            </button>

            <!-- Forgot password link (login mode only) -->
            <div v-if="!isRegister" class="mt-2 text-center">
              <button
                class="text-xs text-shell-text hover:text-shell-green transition-colors"
                @click="showForgotPassword = true; forgotEmail = emailInput; error = ''; success = ''"
              >
                忘记密码？
              </button>
            </div>

            <!-- Resend verification button (shown when login fails due to unverified email) -->
            <div v-if="showResendVerify" class="mt-3">
              <button
                class="w-full text-sm text-yellow-400 border border-yellow-400/30 rounded py-2 hover:bg-yellow-400/10 transition-colors"
                :disabled="loading"
                @click="handleResendVerification"
              >
                {{ loading ? '发送中...' : '📧 重新发送验证邮件' }}
              </button>
            </div>

            <div v-if="success" class="mt-3 text-sm text-shell-green bg-shell-green/10 rounded px-3 py-2">
              {{ success }}
            </div>
            <div v-if="error && !showForgotPassword" class="mt-3 text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">
              {{ error }}
            </div>
          </div>
        </div>

        <!-- API Key Tab -->
        <div v-if="activeTab === 'apikey'">
          <p class="text-sm text-shell-text mb-2">
            输入你在控制面板中签发的 <span class="text-shell-green font-mono">$SHELL 密钥</span>。
          </p>
          <p class="text-xs text-yellow-500/80 mb-3">
            ⚠ 请勿输入 OpenAI、Anthropic 等第三方 API Key
          </p>
          <input
            v-model="apiKeyInput"
            type="password"
            placeholder="sk-shell-xxx"
            class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm font-mono mb-4 focus:outline-none focus:border-shell-green/50"
            @keyup.enter="handleApiKey"
          />
          <button
            class="w-full bg-shell-green text-black py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
            :disabled="loading"
            @click="handleApiKey"
          >
            {{ loading ? '验证中...' : '密钥登录' }}
          </button>

          <!-- Error -->
          <div v-if="error" class="mt-3 text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
