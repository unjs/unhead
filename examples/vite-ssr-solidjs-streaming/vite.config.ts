import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'
import { Unhead } from '@unhead/solid-js/vite'

export default defineConfig({
  plugins: [
    // MUST come before solid() to see JSX before it's compiled to function calls
    Unhead({ streaming: true }),
    solid({ ssr: true }),
  ],
  build: {
    minify: false,
  },
})
