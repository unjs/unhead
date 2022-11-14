<script lang="ts" setup>
useHead({
  titleTemplate: '%s - Nuxt module playground',
  link: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      rel: 'stylesheet',
    },
  ],
  meta: [
    {
      charset: 'utf-8',
    },
    {
      name: 'description',
      content: 'description',
      hid: 'test',
      vmid: 'test',
    },
  ],
})

// example of dynamic inner content that isn't key'd, we want to make sure this isn't duplicated in a SPA mode
// for it not to duplicate in a SSR mode, they must key it
// it's possible to automatically key it based on comparing the unref'd value with the input

const route = useRouter().currentRoute

useHead({
  style: [
    {
      key: 'page-styles',
      tagPosition: 'bodyClose',
      children: () => `.${String(route.value.name)}-${typeof window === 'undefined' ? 'ssr': 'spa'} { background-color: red; }`,
    }
  ]
})
</script>

<template>
<div>
  <div>
    <NuxtPage />
  </div>
  <nuxt-link to="/" style="margin-top: 10px;" as="div">Home</nuxt-link>
  <div style="margin-top: 30px;">
    <DebugHead />
  </div>
</div>
</template>
