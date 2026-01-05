<script setup lang="ts">
import { useHead } from '@unhead/vue'

const delay = typeof window === 'undefined' ? 2625 : 0
const data = await new Promise<{ subscribers: number; discount: number }>(resolve =>
  setTimeout(() => resolve({ subscribers: 50000, discount: 10 }), delay)
)

useHead({
  title: 'StreamShop - Ready!',
  meta: [{ name: 'newsletter-status', content: 'loaded' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
})
</script>

<template>
  <component :is="'script'" v-html="`window.__streamLog?.('Newsletter', '#22d3ee')`" />
  <div class="newsletter">
    <h3>Join Our Newsletter</h3>
    <p>Get {{ data.discount }}% off your first order! Join {{ data.subscribers.toLocaleString() }}+ subscribers.</p>
    <div class="newsletter-form">
      <input type="email" placeholder="Enter your email" />
      <button>Subscribe</button>
    </div>
  </div>
</template>
