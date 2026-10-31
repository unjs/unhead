<script setup lang="ts">
import { ref } from 'vue'

// Dynamic input is intentionally excluded from compiled mode: this page uses
// the ordinary runtime composable, which stays untouched by precompile.
const count = ref(0)
const title = computed(() => `Count ${count.value}`)

useHead({ title })
useSeoMeta({
  description: 'Dynamic page using the normal unhead runtime.',
})
</script>

<template>
  <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto">
    <h1>{{ title }}</h1>
    <button @click="count++">increment</button>
    <NuxtLink to="/">Static page</NuxtLink>
  </div>
</template>
