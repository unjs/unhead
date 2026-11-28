<script lang="ts">
import { useHead } from '../../../src'
import NextPage from './NextPage.svelte'

let page = $state<'first' | 'next'>('first')
useHead({ title: 'First page' })

export function navigate() {
  page = 'next'
}
</script>

<div id="navigation">{#if page === 'next'}<NextPage />{:else}first{/if}</div>
