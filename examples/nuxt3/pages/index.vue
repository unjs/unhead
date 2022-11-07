<script setup lang="ts">
const count = ref(0)

useHead({
  title: () => `test ${count.value}`,
  titleTemplate: '%s - Nuxt module playground',
  link: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      rel: 'stylesheet',
    },
  ],
  meta: [
    {
      charset: () => 'utf-8',
    },
    {
      name: 'description',
      content: ref('description'),
      hid: 'test',
      vmid: 'test',
    },
  ],
  base: {
    href: '/',
  },
})
</script>

<template>
<div>
  Nuxt module playground!
  <button @click="count++">
    Click me
  </button>
  <h1>API</h1>
  <h2>Component</h2>
  <div>
    <NuxtLink to="/api/component/reactivity">
      reactivity
    </NuxtLink>
  </div>
  <h2>Composition</h2>
  <div>
    <NuxtLink to="/api/composition/reactivity">
      reactivity
    </NuxtLink>
  </div>
  <h2>Option</h2>
  <div>
    <NuxtLink to="/api/option/basic">
      Basic
    </NuxtLink>
  </div>
  <h1>Functionality</h1>
  <h2>Features</h2>
  <div>
    <NuxtLink to="/features/delay">
      delay
    </NuxtLink>
  </div>
  <div>
    <NuxtLink to="/features/meta">
      meta
    </NuxtLink>
  </div>
  <div>
    <NuxtLink to="/features/priority">
      priority
    </NuxtLink>
  </div>
  <h2>Raw</h2>
  <div>
    <NuxtLink to="/raw/events">
      events
    </NuxtLink>
  </div>
  <div>
    <NuxtLink to="/raw/html">
      html
    </NuxtLink>
  </div>
  <h2>Examples</h2>
  <div>
    <NuxtLink to="/examples/red">
      red bg
    </NuxtLink>
  </div>
  <h2>Benchmarks</h2>
  <div>
    <NuxtLink to="/benchmark">
      1000x
    </NuxtLink>
  </div>
  <div>
    <NuxtLink to="/benchmark/simple">
      1x
    </NuxtLink>
  </div>

</div>
</template>
