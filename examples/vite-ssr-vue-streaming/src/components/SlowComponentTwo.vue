<script setup>
import SlowComponentThree from './SlowComponentThree.vue'

// Simulate slow component load
await new Promise(resolve => setTimeout(resolve, 3000))

useHead({
  title: 'S2',
  style: [
    '.slow-component-two { color: orange; }',
  ],
  bodyAttrs: {
    style: {
      ['background-color']: 'rgba(255, 165, 0, 0.2)',
    }
  },
  link: [
    {
      key: 'preload',
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta2/css/all.min.css',
    },
  ],
  meta: [
    {
      name: 'description',
      content: 'This is slow component two',
    },
  ]
})
</script>

<template>
  <div class="slow-component slow-component-two">
    <p>Slow component two</p>
    <SlowComponentThree />
  </div>
</template>
