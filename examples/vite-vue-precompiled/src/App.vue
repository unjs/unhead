<script setup lang="ts">
import { ref } from 'vue'
import { useHead, useSeoMeta } from '@unhead/vue/precompiled'
import ProductCard from './components/ProductCard.vue'

useSeoMeta({
  title: 'Widget Pro | Example Store',
  description: 'A fully precompiled product page: every tag below was finalized at build time.',
  ogTitle: 'Widget Pro',
  ogDescription: 'A fully precompiled product page.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://example.com/products/widget-pro' }],
})

const showProduct = ref(true)
</script>

<template>
  <main>
    <h1>Widget Pro</h1>
    <button @click="showProduct = !showProduct">
      {{ showProduct ? 'Hide' : 'Show' }} product details
    </button>
    <ProductCard v-if="showProduct" />
  </main>
</template>
