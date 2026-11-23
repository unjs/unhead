<script lang="ts">
import { onMount } from 'svelte'
import ClientChild from './ClientChild.svelte'

let mounted = $state(false)
onMount(() => {
  mounted = true
})
</script>

<div id="show-after-mount">{#if mounted}<ClientChild />{:else}waiting{/if}</div>
