<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

useHead({
  titleTemplate: '%s | Unhead Demo',
  templateParams: {
    separator: '|',
  },
  htmlAttrs: { lang: 'en' },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'color-scheme', content: 'light dark' },
    { name: 'theme-color', content: '#4f46e5', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#818cf8', media: '(prefers-color-scheme: dark)' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/vite.svg' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  ],
})
</script>

<template>
<div id="layout">
  <nav class="site-nav">
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/about">About</RouterLink>
    <RouterLink to="/blog">Blog</RouterLink>
    <RouterLink to="/scripts">Scripts</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
</div>
</template>

<style scoped>
.site-nav {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}
.site-nav a {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 500;
}
.site-nav a:hover {
  text-decoration: underline;
}
main {
  padding: 2rem;
}
</style>
