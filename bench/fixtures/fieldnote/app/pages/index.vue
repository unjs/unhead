<script setup lang="ts">
useHead({
  link: [{ rel: 'canonical', href: 'https://fieldnote.example/' }],
  bodyAttrs: { 'data-page': 'home' },
})

useSeoMeta({
  title: 'A calmer workspace for teams',
  description: 'Keep projects, notes, and decisions together in a shared workspace.',
  ogTitle: 'Meet Fieldnote',
  ogDescription: 'A calmer workspace for small teams.',
  ogType: 'website',
})
</script>

<template>
  <section class="hero">
    <div>
      <h1>Good work needs room.</h1>
      <p>Keep projects, notes, and decisions together in a shared workspace.</p>
      <UButton class="mt-7 min-h-11" to="/features" trailing-icon="i-lucide-arrow-right" size="lg">
        Explore features
      </UButton>
    </div>
    <div class="preview" aria-label="Example workspace">
      <p class="preview-label">Your workspace</p>
      <h2>Studio launch</h2>
      <ul>
        <li><Icon class="status" name="lucide:circle-check" role="img" aria-label="Complete" /> Agree on the brief</li>
        <li><Icon class="status" name="lucide:circle-check" role="img" aria-label="Complete" /> Share first concepts</li>
        <li><Icon class="status status-open" name="lucide:circle" role="img" aria-label="Open" /> Review with the team</li>
      </ul>
    </div>
  </section>
</template>
