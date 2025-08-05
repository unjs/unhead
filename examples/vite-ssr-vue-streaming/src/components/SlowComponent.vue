<script setup>
import { ref } from 'vue'
import HeadStream from './HeadStream.vue'
import SlowComponentTwo from './SlowComponentTwo.vue'

const message = ref('')

// Simulate slow component load
await new Promise(resolve => setTimeout(resolve, 3000))
message.value = 'Component loaded after 3 second delay!'

useServerHead({
  title: 'S1',
  style: [
    '.slow-component { color: red; }',
  ],
  link: [
    {
      key: 'preload',
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta1/css/all.min.css',
    },
  ],
  meta: [
    {
      name: 'description',
      content: 'This is a slow component',
    },
  ]
})
</script>

<template>
  <div class="slow-component">
    <p>Slow component one</p>
    <HeadStream />
    <SlowComponentTwo />
  </div>
</template>

<style>
.slow-component {
  padding: 2rem;
  margin: 1rem 0;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #ddd;
}
</style>
