<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPasswordWithToken } from '../lib/api'

const route = useRoute()
const router = useRouter()

const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
  token.value = route.query.token as string || ''
  if (!token.value) {
    error.value = '缺少重置 token，请重新点击邮件中的链接'
  }
})

async function handleReset() {
  if (!newPassword.value || newPassword.value.length < 8) {
    error.value = '密码至少需要 8 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await resetPasswordWithToken(token.value, newPassword.value)
    success.value = true
    setTimeout(() => router.push('/'), 3000)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '重置失败，链接可能已过期'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-20 animate-fade-in">
    <h1 class="text-3xl font-bold mb-2 text-center">重置密码</h1>
    <p class="text-shell-text text-center mb-8">为你的 $SHELL 账号设置新密码</p>

    <!-- Success -->
    <div v-if="success" class="text-center">
      <div class="text-shell-green text-4xl mb-4 font-mono">OK</div>
      <p class="text-shell-green mb-2">密码已重置成功！</p>
      <p class="text-shell-text text-sm">即将跳转到首页...</p>
      <RouterLink to="/" class="text-shell-green hover:underline text-sm mt-4 inline-block">
        立即跳转 &rarr;
      </RouterLink>
    </div>

    <!-- Form -->
    <div v-else class="bg-shell-card border border-shell-border rounded-lg p-6">
      <div v-if="error" class="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2 mb-4">
        {{ error }}
      </div>

      <div v-if="token" class="space-y-4">
        <div>
          <label class="text-xs text-shell-text block mb-1">新密码（至少 8 位）</label>
          <input
            v-model="newPassword"
            type="password"
            placeholder="输入新密码"
            class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-shell-green/50"
          />
        </div>
        <div>
          <label class="text-xs text-shell-text block mb-1">确认新密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            class="w-full bg-black border border-shell-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-shell-green/50"
            @keyup.enter="handleReset"
          />
        </div>
        <button
          class="w-full bg-shell-green text-black py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
          :disabled="loading"
          @click="handleReset"
        >
          {{ loading ? '重置中...' : '确认重置密码' }}
        </button>
      </div>

      <div class="mt-4 text-center">
        <RouterLink to="/" class="text-xs text-shell-text hover:text-shell-green transition-colors">
          ← 返回首页
        </RouterLink>
      </div>
    </div>
  </div>
</template>
