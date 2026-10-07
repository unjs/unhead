<script lang="ts">
import type { PrecompiledCsrClientHead } from 'unhead/precompiled/client-csr'
import { useHead, useSeoMeta } from '../../src/precompiled/client-csr'

const { head }: { head: PrecompiledCsrClientHead } = $props()

// svelte-ignore state_referenced_locally
useHead([[10, 'title', 'title', {}, 'Svelte CSR']] as any, { head })
// svelte-ignore state_referenced_locally
useSeoMeta([[100, 'meta:description', 'meta', { name: 'description', content: 'svelte csr description' }]] as any, { head })
</script>
