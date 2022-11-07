<script lang="ts" setup>
import { useHead } from '#head'
const page = ref({
  title: 'Home',
  description: 'Home page description',
  image: 'https://nuxtjs.org/meta_400.png',
})
console.time('useHead x1')
useHead({
  // de-dupe keys
  title: 'bench test',
})
useHead({
  // de-dupe keys
  title: () => `${page.value.title} | Nuxt`,
  meta: [
    {
      name: 'description',
      content: () => `${page.value.description}`,
    },
    {
      property: 'og:image',
      content: () => `${page.value.image}`,
    },
  ],
  script: [
    {
      src: () => 'https://example.com/script.js',
    },
  ],
  link: [
    {
      as: 'style',
      href: () => 'https://example.com/style.js',
    },
  ],
})
const count = ref(0)
console.timeEnd('useHead x1')
const react = () => {
  console.time('patch')
  count.value += 1
  page.value.title = `Updated title: ${count.value}`
  nextTick(() => {
    console.timeEnd('patch')
  })
}
</script>

<template>
  <div>
    <h1>Bench test</h1>
    <button @click="react">
      react
    </button>
  </div>
</template>
