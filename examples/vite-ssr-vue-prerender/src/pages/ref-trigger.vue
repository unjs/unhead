<script setup>
import { ref, onUnmounted } from 'vue'
import { useScript } from '@unhead/vue'

const loadScript = ref(false)
const { status, $script, onLoaded } = useScript({
  key: 'stripe',
  src: 'https://js.stripe.com/v3/',
  onload() {
    console.log('script onload input')
  },
  onerror() {
    console.log('script error')
  },
}, {
  trigger: loadScript,
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
    <h1>ref trigger</h1>
    <button @click="loadScript = true">
      load script
    </button>
    <div>
      ref: {{ loadScript }}
    </div>
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
