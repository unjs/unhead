<script lang="ts">
import { onMount } from 'svelte'
import { useHead, useUnhead } from '../../../src'

const head = useUnhead()
useHead({ title: 'Next page' })
onMount(() => {
  const entry = head.push({ meta: [{ name: 'next-mounted', content: 'yes' }] })
  return () => entry.dispose()
})
</script>

<span id="next">next</span>
