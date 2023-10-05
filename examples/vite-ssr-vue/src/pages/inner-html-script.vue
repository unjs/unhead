<script setup>
import { ref } from 'vue'
import { useScript } from '@unhead/vue'

const isScriptLoaded = ref(false)

const { $script } = useScript({
  key: 'test',
  src: 'example.js',
  onload() {
    console.log('script loaded')
    isScriptLoaded.value = true
  },
  onerror(e) {
    console.log('script error', e)
  },
}, {
  transform: async (script) => {
    delete script.src
    script.innerHTML = await new Promise((resolve) => {
      resolve('console.log(\'hello world\')')
    })
    return script
  },
  trigger: 'manual',
})
$script.waitForUse().then(() => {
  console.log('ready!')
})

useHead({
  title: () => $script.status.value,
})
</script>

<template>
  <div>
    <h1>inner-html-script</h1>
    <div>
      script status: {{ $script.status }}
    </div>
    <button v-if="$script.status.value === 'awaitingLoad'" @click="$script.load">
      Load Script
    </button>
    <button v-if="$script.status.value === 'loaded'" @click="$script.remove">
      Remove Script
    </button>
  </div>
</template>

<style scoped>
h1,
a {
  color: green;
}
</style>
