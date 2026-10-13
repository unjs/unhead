<script lang="ts">
import type { PrecompiledClientHead } from 'unhead/precompiled/client'
import { useHead, useSeoMeta } from '../../src/precompiled/client'

const { head }: { head: PrecompiledClientHead } = $props()

// svelte-ignore state_referenced_locally
useHead([[10, 'title', 'title', {}, 'Svelte']] as any, { head })
// svelte-ignore state_referenced_locally
useSeoMeta([[100, 'meta:description', 'meta', { name: 'description', content: 'svelte description' }]] as any, { head })
</script>
