<script setup lang="ts">
import { useHead } from '@unhead/vue'

const delay = typeof window === 'undefined' ? 625 : 0
const data = await new Promise<{ categories: string[] }>(resolve =>
  setTimeout(() => resolve({
    categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys']
  }), delay)
)

useHead({
  title: 'StreamShop 2/11 - Loading...',
  meta: [{ name: 'nav-loaded', content: 'true' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:18%}' }],
})
</script>

<template>
  <component :is="'script'" v-html="`window.__streamLog?.('Sidebar', '#a78bfa')`" />
  <aside class="sidebar">
    <h3>Categories</h3>
    <ul>
      <li v-for="cat in data.categories" :key="cat">
        <a href="#">{{ cat }}</a>
      </li>
    </ul>
    <div class="filters">
      <h4>Price Range</h4>
      <div class="price-range">$0 - $1000</div>
      <h4>Rating</h4>
      <div class="stars">**** & up</div>
    </div>
  </aside>
</template>
