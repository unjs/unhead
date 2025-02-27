<script lang="ts" setup>
import { useScript } from '@unhead/vue'

interface JSConfettiApi {
  addConfetti: (options: { emojis: string[] }) => void

}

const jsConfetti = useScript<JSConfettiApi>({
  src: 'https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js',
}, {
  trigger: 'client',
  use() {
    // @ts-expect-error untyped
    if (typeof window.JSConfetti !== 'undefined')
      // @ts-expect-error untyped
     return new window.JSConfetti()
  },
})

jsConfetti.onError(err => {
  console.log('oops we had an error')
})

jsConfetti.onLoaded(() => console.log('JSConfetti loaded'))
jsConfetti.proxy.addConfetti({ emojis: ['L', 'O', 'A', 'D', 'E', 'D'] })
function doConfetti() {
  jsConfetti.proxy.addConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })
}
const status = jsConfetti.status
console.log(status)
</script>

<template>
  <button
    @click="doConfetti()"
  >
    Add Confetti
  </button>
<div>
  status: {{ status }}
</div>
</template>
