<script lang="ts">
import { useHead } from '../../../src'
import Child from './Child.svelte'

let show = $state(true)
useHead({ title: 'Parent' })

export function hideChild() {
  show = false
}
</script>

<div id="parent">{#if show}<Child />{:else}gone{/if}</div>
