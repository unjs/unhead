<template>
  <h1>Red</h1>
</template>

<script>
import { useHead } from '@unhead/vue'

export default {
  async setup() {
    useHead({
      title: 'Red',
      htmlAttrs: {
        style: 'background: red',
      },
      bodyAttrs: {
        class: ['white'],
      }
    })
  },
}
</script>

<style>
.white {
  color: white;
}
</style>
