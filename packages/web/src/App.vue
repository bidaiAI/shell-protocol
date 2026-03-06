<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useWallet } from './lib/wallet'

const { connected, shortAddress, connect, disconnect, isAuthenticated } = useWallet()

const connectError = ref('')
const menuOpen = ref(false)

// Auto-close mobile menu on route change
const router = useRouter()
watch(() => router.currentRoute.value.path, () => { menuOpen.value = false })

async function handleConnect() {
  connectError.value = ''
  try {
    await connect()
  }
  catch (err) {
    connectError.value = err instanceof Error ? err.message : '连接失败'
    setTimeout(() => { connectError.value = '' }, 5000)
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navigation -->
    <header class="border-b border-shell-border bg-shell-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <nav class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="text-shell-green font-bold text-lg tracking-tight">
            $SHELL
          </RouterLink>
          <div class="hidden sm:flex items-center gap-4 text-sm">
            <RouterLink
              to="/leaderboard"
              class="text-shell-text hover:text-white transition-colors"
              active-class="!text-shell-green"
            >
              排行榜
            </RouterLink>
            <RouterLink
              to="/tasks"
              class="text-shell-text hover:text-white transition-colors"
              active-class="!text-shell-green"
            >
              任务动态
            </RouterLink>
            <RouterLink
              v-if="isAuthenticated"
              to="/dashboard"
              class="text-shell-text hover:text-white transition-colors"
              active-class="!text-shell-green"
            >
              控制面板
            </RouterLink>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Hamburger button (mobile only) -->
          <button
            class="sm:hidden text-shell-text hover:text-white p-1"
            @click="menuOpen = !menuOpen"
            aria-label="菜单"
          >
            <svg v-if="!menuOpen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div v-if="!connected" class="flex items-center gap-2">
            <span v-if="connectError" class="text-red-400 text-xs">{{ connectError }}</span>
            <button
              class="bg-shell-green text-black px-4 py-1.5 text-sm font-semibold rounded hover:bg-shell-green-dim transition-colors"
              @click="handleConnect"
            >
              连接钱包
            </button>
          </div>
          <div v-else class="flex items-center gap-3">
            <span class="text-shell-green text-sm font-mono">{{ shortAddress }}</span>
            <button
              class="text-shell-text text-sm hover:text-white transition-colors"
              @click="disconnect"
            >
              断开
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile dropdown menu -->
      <div v-if="menuOpen" class="sm:hidden border-t border-shell-border bg-shell-dark/95 backdrop-blur-sm">
        <div class="px-4 py-3 flex flex-col gap-2 text-sm">
          <RouterLink
            to="/leaderboard"
            class="text-shell-text hover:text-white py-1.5 transition-colors"
            active-class="!text-shell-green"
          >
            排行榜
          </RouterLink>
          <RouterLink
            to="/tasks"
            class="text-shell-text hover:text-white py-1.5 transition-colors"
            active-class="!text-shell-green"
          >
            任务动态
          </RouterLink>
          <RouterLink
            v-if="isAuthenticated"
            to="/dashboard"
            class="text-shell-text hover:text-white py-1.5 transition-colors"
            active-class="!text-shell-green"
          >
            控制面板
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t border-shell-border py-6 text-center text-shell-text text-xs">
      <p>$SHELL Protocol &mdash; 去中心化 AI 红队测试网络</p>
    </footer>
  </div>
</template>
