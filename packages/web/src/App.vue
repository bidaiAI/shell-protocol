<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useWallet } from './lib/wallet'

const { connected, shortAddress, connect, disconnect, isAuthenticated } = useWallet()
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

        <div>
          <button
            v-if="!connected"
            class="bg-shell-green text-black px-4 py-1.5 text-sm font-semibold rounded hover:bg-shell-green-dim transition-colors"
            @click="connect"
          >
            连接钱包
          </button>
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
