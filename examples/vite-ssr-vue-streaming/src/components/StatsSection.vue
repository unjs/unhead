<script setup lang="ts">
import { useHead } from '@unhead/vue'

const delay = typeof window === 'undefined' ? 1000 : 0
const stats = await new Promise<{ customers: number; products: number; countries: number }>(resolve =>
  setTimeout(() => resolve({ customers: 100000, products: 5000, countries: 50 }), delay)
)

useHead({
  title: 'About StreamShop - Ready!',
  meta: [
    { name: 'stats-loaded', content: 'true' },
    { property: 'og:title', content: 'About StreamShop' },
  ],
  style: [{ key: 'progress', innerHTML: '.stream-progress{opacity:0;transition:opacity 0.3s}' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'StreamShop',
      foundingDate: '2020',
    }),
  }],
})
</script>

<template>
  <section class="stats-section">
    <h2>Our Impact</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-number">{{ stats.customers.toLocaleString() }}+</span>
        <span class="stat-label">Happy Customers</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ stats.products.toLocaleString() }}+</span>
        <span class="stat-label">Products</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ stats.countries }}+</span>
        <span class="stat-label">Countries</span>
      </div>
    </div>
  </section>
</template>
