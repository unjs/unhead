<script setup lang="ts">
useHead({
  style: [
    {
      children: 'body { background-color: red; }',
    }
  ],
  bodyAttrs: {
    ['data-page-attr']: 'red'
  },
  title: 'red',
})
</script>

<template>
  <div>
    <h2>red bg</h2>
    <NuxtLink to="/">
      back
    </NuxtLink>
  </div>
</template>
