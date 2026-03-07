<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyEmailToken } from '../lib/api'
import { useWallet } from '../lib/wallet'

const route = useRoute()
const router = useRouter()
const { loginWithToken } = useWallet()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMsg = ref('')

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    status.value = 'error'
    errorMsg.value = '缺少验证 token'
    return
  }

  try {
    const result = await verifyEmailToken(token)
    loginWithToken(result.token, result.user.email ?? undefined)
    status.value = 'success'
    // Redirect to dashboard after 2 seconds
    setTimeout(() => router.push('/dashboard'), 2000)
  }
  catch (err) {
    status.value = 'error'
    errorMsg.value = err instanceof Error ? err.message : '验证失败'
  }
})
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-20 text-center animate-fade-in">
    <!-- Loading -->
    <div v-if="status === 'loading'">
      <div class="text-shell-green text-4xl mb-4 font-mono">...</div>
      <p class="text-shell-text">正在验证邮箱...</p>
    </div>

    <!-- Success -->
    <div v-else-if="status === 'success'">
      <div class="text-shell-green text-4xl mb-4 font-mono">OK</div>
      <h1 class="text-2xl font-bold mb-2">邮箱验证成功</h1>
      <p class="text-shell-text mb-4">即将跳转到控制面板...</p>
      <RouterLink to="/dashboard" class="text-shell-green hover:underline text-sm">
        立即跳转 &rarr;
      </RouterLink>
    </div>

    <!-- Error -->
    <div v-else>
      <div class="text-tier-apex text-4xl mb-4 font-mono">ERR</div>
      <h1 class="text-2xl font-bold mb-2">验证失败</h1>
      <p class="text-red-400 mb-4">{{ errorMsg }}</p>
      <RouterLink to="/" class="text-shell-green hover:underline text-sm">
        返回首页 &rarr;
      </RouterLink>
    </div>
  </div>
</template>
