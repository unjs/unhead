<script lang="ts" setup>
import { useHead } from '#head'
const page = ref({
  title: 'Home',
  description: 'Home page description',
  image: 'https://nuxtjs.org/meta_400.png',
})
console.time('useHead x1000')
useHead({
  // de-dupe keys
  title: 'bench test',
})
for (const i in Array.from({ length: 1000 })) {
  useHead({
    // de-dupe keys
    title: () => `${page.value.title}-${i} | Nuxt`,
    meta: [
      {
        name: 'description',
        content: () => `${page.value.description} ${i}`,
      },
      {
        property: 'og:image',
        content: () => `${page.value.image}?${i}`,
      },
    ],
    script: [
      {
        src: () => `https://example.com/script.js?${i}`,
      },
    ],
    link: [
      {
        as: 'style',
        href: () => `https://example.com/style.js?${i}`,
      },
    ],
  })
}
const count = ref(0)
console.timeEnd('useHead x1000')
const react = () => {
  console.time('patch')
  page.value.title = `Updated ${count.value++}`
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
