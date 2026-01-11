<script setup lang="ts">
import { useHead } from '@unhead/vue'

const delay = typeof window === 'undefined' ? 500 : 0
const team = await new Promise<{ name: string; role: string }[]>(resolve =>
  setTimeout(() => resolve([
    { name: 'Alice Chen', role: 'CEO & Founder' },
    { name: 'Bob Smith', role: 'CTO' },
    { name: 'Carol Davis', role: 'Head of Design' },
  ]), delay)
)

useHead({
  title: 'About StreamShop - Meet Our Team',
  meta: [{ name: 'team-loaded', content: 'true' }],
  style: [{ key: 'progress', innerHTML: '.stream-progress::after{width:50%}' }],
})
</script>

<template>
  <section class="team-section">
    <h2>Our Team</h2>
    <div class="team-grid">
      <div v-for="member in team" :key="member.name" class="team-card">
        <div class="team-avatar">[avatar]</div>
        <h3>{{ member.name }}</h3>
        <p>{{ member.role }}</p>
      </div>
    </div>
  </section>
</template>
