<script setup lang="ts">
import { Suspense } from 'vue'
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import TeamSection from '../components/TeamSection.vue'
import StatsSection from '../components/StatsSection.vue'

useHead({
  title: 'About StreamShop',
  htmlAttrs: { lang: 'en', 'data-page': 'about' },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Learn about StreamShop and our mission' },
    { name: 'page-id', content: 'about' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/about' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:10%}' }],
})
</script>

<template>
  <div class="app">
    <div class="stream-progress" />
    <header class="site-header">
      <div class="logo">StreamShop</div>
      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </header>

    <main class="about-content">
      <nav class="page-nav">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <RouterLink to="/about" class="nav-link active">About</RouterLink>
      </nav>

      <div class="about-hero">
        <h1>About StreamShop</h1>
        <p>We're on a mission to make online shopping faster and more enjoyable.</p>
      </div>

      <Suspense>
        <template #default>
          <TeamSection />
        </template>
        <template #fallback>
          <div class="skeleton team-skeleton">Loading team...</div>
        </template>
      </Suspense>

      <Suspense>
        <template #default>
          <StatsSection />
        </template>
        <template #fallback>
          <div class="skeleton stats-skeleton">Loading stats...</div>
        </template>
      </Suspense>
    </main>

    <footer class="site-footer">
      <p>2024 StreamShop - Vue Streaming SSR Demo</p>
    </footer>
  </div>
</template>
