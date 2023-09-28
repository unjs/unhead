<script setup>
import { ref } from 'vue'
import { useScript } from '@unhead/vue'

const isScriptLoaded = ref(false)

const { $script } = useScript({
  src: 'https://js.stripe.com/v10',
  onload() {
    console.log('script loaded')
    isScriptLoaded.value = true
  },
  onerror() {
    console.log('script error')
  },
}, {
  trigger: 'idle',
})

console.log($script.status)

useHead({
  title: () => $script.status.value,
})
</script>

<template>
  <div>
    <h1>manual-script</h1>
    <button @click="$script.load">
      load script
    </button>
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
