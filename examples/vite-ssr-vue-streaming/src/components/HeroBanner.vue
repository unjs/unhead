<script setup lang="ts">
import { useHead } from '@unhead/vue'

const delay = typeof window === 'undefined' ? 1000 : 0
const data = await new Promise<{ title: string; subtitle: string; discount: number }>(resolve =>
  setTimeout(() => resolve({
    title: 'Winter Sale',
    subtitle: 'Up to 50% off selected items',
    discount: 50
  }), delay)
)

useHead({
  title: 'StreamShop 3/11 - Loading...',
  meta: [
    { property: 'og:title', content: `${data.title} - ${data.discount}% Off` },
  ],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:27%}' }],
})
</script>

<template>
  <component :is="'script'" v-html="`window.__streamLog?.('Hero Banner', '#f472b6')`" />
  <div class="hero-banner">
    <h1>{{ data.title }}</h1>
    <p>{{ data.subtitle }}</p>
    <button class="cta-button">Shop Now</button>
  </div>
</template>
