<script setup lang="ts">
useHead({
  link: [{ rel: 'canonical', href: 'https://fieldnote.example/features' }],
  bodyAttrs: { 'data-page': 'features' },
})

useSeoMeta({
  title: 'Features',
  description: 'Plan projects, record decisions, and share progress in Fieldnote.',
  ogTitle: 'Fieldnote features',
  ogDescription: 'A shared place for the work your team does every day.',
})

const features = [
  { title: 'Plan projects', description: 'Give every task a clear owner and due date.' },
  { title: 'Record decisions', description: 'Keep the context your team will need next time.' },
  { title: 'Share progress', description: 'Post updates where everyone can find them.' },
]
</script>

<template>
  <section class="inner-page">
    <h1>Keep work together.</h1>
    <p>Give your team one place to plan and share what happens next.</p>
    <div class="cards">
      <article v-for="feature in features" :key="feature.title" class="card">
        <h2>{{ feature.title }}</h2>
        <p>{{ feature.description }}</p>
      </article>
    </div>
    <UButton class="mt-7 min-h-11" to="/pricing" trailing-icon="i-lucide-arrow-right" size="lg">
      See pricing
    </UButton>
  </section>
</template>
