<script lang="ts" setup>
const timeTaken = ref(0)

const page = ref({
  title: 'Home',
  description: 'Home page description',
  image: 'https://nuxtjs.org/meta_0.png',
})
const start = performance.now()
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
const end = performance.now()
// round the total time as seconds
timeTaken.value = Math.round(end - start) / 1000
function react() {
  console.time('patch')
  page.value.image = page.value.image.replace(`_${String(count.value)}`, `_${String(++count.value)}`)
  page.value.title = `Updated ${count.value}`
  nextTick(() => {
    console.timeEnd('patch')
  })
}
</script>

<template>
  <div>
    <h1>Bench test</h1>
    <p>Mount: {{ timeTaken }}ms</p>
    <button @click="react">
      react
    </button>
  </div>
</template>
