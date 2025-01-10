<script lang="ts">
import { useHead } from 'unhead'

let count: number = $state(0)
const increment = () => {
  count += 1
}

useHead({
  title: () => {
    console.log('resolving')
    return `${count} - Counter`
  }
})
</script>

<button onclick={increment}>
  count is {count}
</button>
