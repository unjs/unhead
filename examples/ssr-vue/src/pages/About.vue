<template>
  <h1>About</h1>
</template>

<script>
import { useHead } from '@unhead/vue'

export default {
  async setup() {
    useHead({
      title: 'About',
      meta: [
        {
          name: 'description',
          content: 'This is an about page',
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
