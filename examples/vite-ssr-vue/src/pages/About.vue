<template>
  <h1>About</h1>
</template>

<script>
import { useHead } from '@unhead/vue'

export default {
  async setup() {
    useHead({
      title: 'About',
      htmlAttrs: {
        class: 'about-page'
      },
      bodyAttrs: {
        style: 'background-color: aquamarine'
      },
      meta: [
        {
          name: 'description',
          content: 'This is an about page',
        }
      ],
      style: [
        {
          children: '#app { background: aqua; color: white; }',
        }
      ]
    })
  },
}
</script>

<style scoped>
h1 {
  color: red;
}
</style>
