<script lang="ts">
import { useHead, useScript } from '@unhead/svelte'
import {onMount} from "svelte";

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

onMount(() => {
  console.log('mounted')
})

const { onLoaded } = useScript('https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js', {
  use() {
    if (typeof window === 'undefined') {
      console.log('bad use() on server')
      return
    }
    console.log('good use() on client', !!(window as any).JSConfetti)
    return (window as any).JSConfetti
  }
})
onLoaded((inst) => {
  console.log('loaded js confetti', inst)
  isConfettiReady = true
  jsConfetti = new inst()
})
</script>

<button onclick={increment}>
  count is {count}
</button>
