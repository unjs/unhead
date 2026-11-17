<script lang="ts">
import { untrack } from 'svelte'
import { useHead } from '../../../src'

let title = $state('One')
const entry = useHead({ title: untrack(() => title) })

$effect(() => {
  entry.patch({ title })
})

export function setTitle(next: string) {
  title = next
}
</script>

<div id="title">{title}</div>
