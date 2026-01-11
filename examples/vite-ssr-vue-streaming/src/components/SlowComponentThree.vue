<script setup>
import { ref } from 'vue'
import HeadStream from './HeadStream.vue'

// Simulate slow component load
await new Promise(resolve => setTimeout(resolve, 3000))

useServerHead({
  title: 'S3',
  style: [
    '.slow-component-three { color: green; }',
  ],
  bodyAttrs: {
    style: {
      ['background-color']: 'rgba(0, 128, 0, 0.2)',
    }
  },
  link: [
    {
      key: 'preload',
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    },
  ],
  meta: [
    {
      name: 'description',
      content: 'This is a slow component two',
    },
  ]
})
</script>

<template>
  <div class="slow-component slow-component-three">
    <p>Slow component three</p>
    <HeadStream />
  </div>
</template>
