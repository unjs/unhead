import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Unhead } from '@unhead/svelte/vite'

export default defineConfig({
  plugins: [
    Unhead({ streaming: true }),
    svelte(),
  ],
})
