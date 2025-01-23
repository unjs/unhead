<script setup>
import { useHead } from '@unhead/vue'
import { onMounted, getCurrentInstance, withAsyncContext } from 'vue'

// await new Promise((resolve) => setTimeout(resolve, 100))
// useHead({
//   title: 'post promise'
// })
const vm = getCurrentInstance()

onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100))
  setCurrentInstance(vm)
  useHead({
    title: 'onMounted post promise'
  })
})
</script>

<template>
  <div>
    <h1>async-head</h1>
  </div>
</template>
