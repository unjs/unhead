<script lang="ts">
import type { DeferredPrecompiledClientHead } from 'unhead/precompiled/client-deferred'
import { useHead, useSeoMeta } from '../../src/precompiled/client-deferred'

const { head }: { head: DeferredPrecompiledClientHead } = $props()

// svelte-ignore state_referenced_locally
useHead([[10, 'title', 'title', {}, 'Svelte deferred']] as any, { head })
// svelte-ignore state_referenced_locally
useSeoMeta([[100, 'meta:description', 'meta', { name: 'description', content: 'svelte deferred description' }]] as any, { head })
</script>
