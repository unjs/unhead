<script lang="ts" setup>
import { useScript } from '@unhead/vue'

const proxy = useScript<JSConfettiApi>({
  src: 'https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js',
}, {
  trigger: 'client',
  use() {
    if (typeof window.JSConfetti === 'undefined')
      return false
    return new window.JSConfetti()
  },
})

proxy.$script.then(() => console.log('JSConfetti loaded'))
console.log('top level proxy addConfetti', proxy,  typeof proxy.addConfetti, proxy.addConfetti)
proxy.addConfetti({ emojis: ['L', 'O', 'A', 'D', 'E', 'D'] })

function doConfetti() {
  console.log('pre doConfetti', proxy, typeof proxy.addConfetti, proxy.addConfetti)
  proxy.addConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })
}
</script>

<template>
  <button
    @click="doConfetti()"
  >
    Add Confetti
  </button>
</template>
