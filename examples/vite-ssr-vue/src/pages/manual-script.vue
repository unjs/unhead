<script setup>
import { ref, onUnmounted } from 'vue'
import { useScript } from '@unhead/vue'

const isScriptLoaded = ref(false)

const { $script, onLoaded } = useScript({
  key: 'stripe',
  src: 'https://js.stripe.com/v3/',
  onload() {
    console.log('script onload input')
    isScriptLoaded.value = true
  },
  onerror() {
    console.log('script error')
  },
}, {
  trigger: 'manual',
})

onLoaded(() => {
  console.log('on loaded callback')
})
$script.then(() => {
  console.log('script promise callback')
})

onUnmounted(() => {
  $script.load()
})

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
