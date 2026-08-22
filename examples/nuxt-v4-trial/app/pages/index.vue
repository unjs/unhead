<script setup lang="ts">
// Ordinary Nuxt head usage. Nuxt creates and owns its head instance from the
// normal @unhead/vue runtime, so compiled plans (which need a sealed head)
// cannot attach inside Nuxt yet; the experimental.precompile flag stays inert
// for ordinary imports. Static calls like this one are still lowered by the
// seoMeta transform, and dynamic input keeps working.
useSeoMeta({
  description: 'A Nuxt app running the workspace unhead with precompile enabled (inert for ordinary imports).',
  ogTitle: 'Nuxt + unhead workspace',
  ogType: 'website',
})
</script>

<template>
  <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto">
    <h1>Nuxt + unhead</h1>
    <p>This app runs the workspace unhead packages with the bundler plugin active.</p>
    <NuxtLink to="/dynamic">Dynamic page</NuxtLink>
  </div>
</template>
