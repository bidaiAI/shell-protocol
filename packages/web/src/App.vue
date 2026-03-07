<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useWallet } from './lib/wallet'
import AuthModal from './components/AuthModal.vue'

const { disconnect, isAuthenticated, displayName } = useWallet()

const showAuthModal = ref(false)
const menuOpen = ref(false)

// Auto-close mobile menu on route change
const router = useRouter()
watch(() => router.currentRoute.value.path, () => { menuOpen.value = false })
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
              to="/task-center"
              class="text-shell-text hover:text-white transition-colors"
              active-class="!text-shell-green"
            >
              任务中心
            </RouterLink>
            <RouterLink
              to="/disclosures"
              class="text-shell-text hover:text-white transition-colors"
              active-class="!text-shell-green"
            >
              漏洞公示
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
          <!-- Social icons (desktop only) -->
          <div class="hidden sm:flex items-center gap-2">
            <a
              href="https://github.com/openshell-cc/shell-protocol"
              target="_blank"
              class="text-shell-text hover:text-shell-green transition-colors p-1"
              aria-label="GitHub"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://x.com/openshell_cc"
              target="_blank"
              class="text-shell-text hover:text-shell-green transition-colors p-1"
              aria-label="X (Twitter)"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>

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

          <div v-if="!isAuthenticated" class="flex items-center gap-2">
            <button
              class="bg-shell-green text-black px-4 py-1.5 text-sm font-semibold rounded hover:bg-shell-green-dim transition-colors"
              @click="showAuthModal = true"
            >
              登录
            </button>
          </div>
          <div v-else class="flex items-center gap-3">
            <span class="text-shell-green text-sm font-mono">{{ displayName }}</span>
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
            to="/task-center"
            class="text-shell-text hover:text-white py-1.5 transition-colors"
            active-class="!text-shell-green"
          >
            任务中心
          </RouterLink>
          <RouterLink
            to="/disclosures"
            class="text-shell-text hover:text-white py-1.5 transition-colors"
            active-class="!text-shell-green"
          >
            漏洞公示
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

    <!-- Auth Modal -->
    <AuthModal v-if="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>
