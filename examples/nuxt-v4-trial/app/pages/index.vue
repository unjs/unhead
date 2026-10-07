<script setup lang="ts">
// Compiled mode inside Nuxt via the local `sealed-head` module: static calls
// target the sealed head explicitly and become build-time render plans, while
// Nuxt's own runtime head keeps serving dynamic usage (`/dynamic`).
import { useHead, useSeoMeta } from '@unhead/vue/precompiled'

const head = useSealedHead()

useSeoMeta({
  description: 'Static head calls on this page were finalized at build time and merged during SSR.',
  ogTitle: 'Nuxt Precompiled',
  ogType: 'website',
}, { head })

useHead({
  link: [{ rel: 'canonical', href: 'https://example.com/' }],
}, { head })
</script>

<template>
  <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto">
    <h1>Nuxt + unhead compiled mode</h1>
    <p>View source: the description, og:title and canonical tags are precompiled plans.</p>
    <NuxtLink to="/dynamic">Dynamic page (normal runtime)</NuxtLink>
  </div>
</template>
