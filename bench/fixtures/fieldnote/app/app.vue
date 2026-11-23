<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'en' },
  titleTemplate: '%s | Fieldnote',
  meta: [{ name: 'theme-color', content: '#f7f9f4' }],
})

useSeoMeta({
  ogSiteName: 'Fieldnote',
  twitterCard: 'summary',
})
</script>

<template>
  <UApp>
    <div class="shell">
      <header class="site-header frame">
        <NuxtLink class="wordmark" to="/">
          <Icon class="mark" name="lucide:diamond" aria-hidden="true" />
          Fieldnote
        </NuxtLink>
        <nav aria-label="Main navigation">
          <NuxtLink to="/features">Features</NuxtLink>
          <NuxtLink to="/pricing">Pricing</NuxtLink>
        </nav>
      </header>
      <main class="frame">
        <NuxtPage />
      </main>
      <footer class="site-footer frame">
        <span>Fieldnote</span>
        <span>Make room for good work.</span>
      </footer>
    </div>
  </UApp>
</template>
