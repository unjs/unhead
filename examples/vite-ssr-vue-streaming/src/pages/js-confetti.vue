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
    if (typeof window.JSConfetti !== 'undefined')
     return new window.JSConfetti()
  },
})

jsConfetti.catch(err => {
  console.log('oops we had an error')
})

jsConfetti.$script.then(() => console.log('JSConfetti loaded'))
console.log('top level proxy addConfetti', jsConfetti,  typeof jsConfetti.addConfetti, jsConfetti.addConfetti)
jsConfetti.addConfetti({ emojis: ['L', 'O', 'A', 'D', 'E', 'D'] })

function doConfetti() {
  console.log('pre doConfetti', jsConfetti, typeof jsConfetti.addConfetti, jsConfetti.addConfetti)
  jsConfetti.addConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })
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
