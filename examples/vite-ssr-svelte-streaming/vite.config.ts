import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import unhead from '@unhead/svelte/vite'

export default defineConfig({
  plugins: [
    unhead({ streaming: true }),
    svelte(),
  ],
})
