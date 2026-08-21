<script setup lang="ts">
const count = ref(0)
const title = computed(() => count.value === 0 ? 'Home' : `Home (${count.value})`)

useHead({
  title: () => title.value,
  meta: [
    { name: 'description', content: 'Nuxt on unhead v4: home page' },
  ],
})
</script>

<template>
  <main>
    <h1>Home</h1>
    <p>Reactive title driven by a ref.</p>
    <button id="bump" @click="count++">
      Bump title ({{ count }})
    </button>
  </main>
</template>
