<script lang="ts">
import { useHead, useScript } from '@unhead/svelte'

let count: number = $state(0)
let isConfettiReady = $state(false)
let jsConfetti = $state(null)
const increment = () => {
  count += 1
  if (isConfettiReady && count > 5) {
    jsConfetti?.addConfetti({
      emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'],
    })
  }
}

const entry = useHead()
$effect(() => {
  entry.patch({
    title: `${count} - Counter`
  })
})

const { onLoaded } = useScript('https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js', {
  use() {
    if (typeof window === 'undefined') {
      return
    }
    return (window as any).JSConfetti
  }
})
onLoaded((inst) => {
  isConfettiReady = true
  jsConfetti = new inst()
})
</script>

<button onclick={increment}>
  count is {count}
</button>
