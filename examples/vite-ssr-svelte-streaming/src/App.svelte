<script lang="ts">
import svelteLogo from './assets/svelte.svg'
import Counter from './lib/Counter.svelte'
import SlowComponent from './lib/SlowComponent.svelte'
import { useHead } from '@unhead/svelte'

useHead({
  htmlAttrs: { class: 'layout-default' },
  bodyAttrs: { style: 'overflow: hidden;' },
  script: [
    {
      tagPosition: 'bodyClose',
      innerHTML: 'console.log("Hello world")',
    },
  ],
})
</script>

<main>
  <div>
    <a href="https://vite.dev" target="_blank" rel="noreferrer">
      <img src="/vite.svg" class="logo" alt="Vite Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank" rel="noreferrer">
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>
  <h1>Vite + Svelte Streaming</h1>

  <div class="card">
    <Counter />
  </div>

  <div>
    <SlowComponent data={{ message: 'Data from parent' }} />
  </div>

  <p class="read-the-docs">
    Click on the Vite and Svelte logos to learn more
  </p>
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }
</style>
