<script lang="ts">
import { useHead } from '@unhead/svelte'

let count: number = $state(0)
const increment = () => {
  count += 1
}

const entry = useHead()
$effect(() => {
  entry.patch({
    title: `${count} - Counter`
  })
})
</script>

<button onclick={increment}>
  count is {count}
</button>
