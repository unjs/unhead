<script setup>
import { reactive } from 'vue'

const state = reactive({
  count: 0,
})

useHead({
  title: () => `"${state.count}" times`,
  titleTemplate: '%s - myApp',
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
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
