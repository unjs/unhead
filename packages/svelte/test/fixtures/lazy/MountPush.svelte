<script lang="ts">
import { onMount } from 'svelte'
import { useUnhead } from '../../../src'

const head = useUnhead()
onMount(() => {
  const entry = head.push({ meta: [{ name: 'mounted', content: 'yes' }] })
  return () => entry.dispose()
})
</script>

<div id="mount-push">x</div>
