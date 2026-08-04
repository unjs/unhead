<script setup lang="ts">
useSeoMeta({
  title: 'About',
  description: 'Nuxt on unhead v4: about page',
  ogTitle: 'About the v4 trial',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://example.com/about' },
  ],
})
</script>

<template>
  <main>
    <h1>About</h1>
    <p>useSeoMeta plus a canonical link.</p>
  </main>
</template>
