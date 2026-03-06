<script setup lang="ts">
</script>

<template>
  <div class="max-w-xl mx-auto px-4 py-24 text-center animate-fade-in">
    <div class="text-6xl font-bold text-shell-green mb-4">404</div>
    <h1 class="text-2xl font-bold mb-2">页面不存在</h1>
    <p class="text-shell-text mb-8">你访问的页面可能已被移除或从未存在。</p>
    <RouterLink
      to="/"
      class="inline-block bg-shell-green text-black px-6 py-3 font-semibold rounded hover:bg-shell-green-dim transition-colors"
    >
      返回首页
    </RouterLink>
  </div>
</template>
