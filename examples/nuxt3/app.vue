<script setup lang="ts">
import { useHead } from '#head'

useHead({
  htmlAttrs: {
    class: {
      'dark-mode': true,
    }
  },
  bodyAttrs: {
    class: ['my-body-class'],
  },
  title: 'Title',
  style: [
    {
      key: 'bg-colour',
      children: '.new-bg { background-color: yellow; }',
    }
  ],
  titleTemplate: title => `${title} | Title Site`,
})

</script>

<template>
  <div>
    <NuxtPage />
  </div>
</template>
