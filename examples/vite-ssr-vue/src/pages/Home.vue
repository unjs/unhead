<script setup>
import { reactive, ref } from 'vue'

const state = reactive({
  count: 0,
})

useHead({
  title: () => `${state.count} times`,
})

const isScriptLoaded = ref(false)

useHead({
  script: [
    {
      key: 'stripe',
      src: 'https://js.stripe.com/v3/',
      onload() {
        console.log('script loaded')
        isScriptLoaded.value = true
      },
      onerror() {
        console.log('script error')
      },
    },
  ],
})
</script>

<template>
  <h1>Home</h1>
  <p>
    <img src="../assets/logo.png" alt="logo">
  </p>
  <button @click="state.count++">
    count is: {{ state.count }}
  </button>
  <div>
    loaded: {{ isScriptLoaded }}
  </div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
