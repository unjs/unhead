<script setup lang="ts">
import { useHead } from '@unhead/vue'

const delay = typeof window === 'undefined' ? 250 : 0
const data = await new Promise<{ user: string; cartCount: number }>(resolve =>
  setTimeout(() => resolve({ user: 'John Doe', cartCount: 3 }), delay)
)

useHead({
  title: 'StreamShop 1/11 - Loading...',
  meta: [{ name: 'user-status', content: 'logged-in' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:9%}' }],
})
</script>

<template>
  <component :is="'script'" v-html="`window.__streamLog?.('Header', '#60a5fa')`" />
  <header class="site-header">
    <div class="logo">StreamShop</div>
    <nav class="nav-links">
      <a href="#">Home</a>
      <a href="#">Products</a>
      <a href="#">Categories</a>
      <a href="#">Deals</a>
    </nav>
    <div class="user-area">
      <span class="cart">{{ data.cartCount }}</span>
      <span class="user">{{ data.user }}</span>
    </div>
  </header>
</template>
