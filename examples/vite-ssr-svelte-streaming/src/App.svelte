<script lang="ts">
import HomePage from './pages/HomePage.svelte'
import AboutPage from './pages/AboutPage.svelte'

interface Props {
  url?: string
}

let { url = '/' }: Props = $props()

// Simple routing based on URL
const isAbout = url === '/about'
</script>

{#if isAbout}
  <AboutPage />
{:else}
  <HomePage />
{/if}
