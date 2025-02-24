<script setup>
import { useScript } from '@unhead/vue'

const { status, onLoaded } = useScript({
  src: 'https://timeout.script',
}, {
  // leaving the page will stop the trigger from activating
  // trigger: new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve()
  //   }, 2)
  // }),
})
</script>

<template>
  <div>
    <h1>timer-script 2</h1>
    <div>
      script status: {{ status }}
    </div>
  </div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
