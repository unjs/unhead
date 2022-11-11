<script lang="ts" setup>
useHead({
  title: 'test',
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
