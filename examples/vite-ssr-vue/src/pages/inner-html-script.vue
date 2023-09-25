<script setup>
import { ref } from 'vue'
import { useScript } from "@unhead/vue";

const isScriptLoaded = ref(false)

const { $script } = useScript({
  innerHTML: `console.log('hello world')`,
  onload() {
    console.log('script loaded')
    isScriptLoaded.value = true
  },
  onerror(e) {
    console.log('script error', e)
  }
})

useHead({
  title: () => $script.status.value
})
</script>

<template>
<div>
  <h1>inner-html-script</h1>
  <div>
    script status: {{ $script.status }}
  </div>
</div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
