<script lang="ts">
import { useHead } from '@unhead/svelte'
import TeamSection from '../components/TeamSection.svelte'
import StatsSection from '../components/StatsSection.svelte'

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

<div class="app">
  <div class="stream-progress"></div>
  <header class="site-header">
    <div class="logo">StreamShop</div>
    <nav class="nav-links">
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main class="about-content">
    <nav class="page-nav">
      <a href="/" class="nav-link">Home</a>
      <a href="/about" class="nav-link active">About</a>
    </nav>

    <div class="about-hero">
      <h1>About StreamShop</h1>
      <p>We're on a mission to make online shopping faster and more enjoyable.</p>
    </div>

    <TeamSection />
    <StatsSection />
  </main>

  <footer class="site-footer">
    <p>2024 StreamShop - Svelte Streaming SSR Demo</p>
  </footer>
</div>
