import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { unheadSveltePlugin } from '@unhead/svelte/stream/vite'

export default defineConfig({
  plugins: [
    unheadSveltePlugin({ streaming: true }),
    svelte(),
  ],
})
