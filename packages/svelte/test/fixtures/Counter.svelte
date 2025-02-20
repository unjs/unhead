<!-- tests/fixtures/Counter.svelte -->
<script lang="ts">
import { useHead } from '../../src/composables'

let count = $state(0)
let id = crypto.randomUUID()

const entry = useHead()

$effect(() => {
  entry.patch({
    title: `Count is ${count}`,
    meta: [
      {
        name: `counter-${id}`,
        content: String(count)
      }
    ]
  })
})

function increment() {
  count++
}
</script>

<button onclick={increment}>
  count is {count}
</button>
