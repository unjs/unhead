import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import unhead from '@unhead/solid-js/vite'

export default defineConfig({
  plugins: [
    // MUST come before solid() to see JSX before it's compiled to function calls
    unhead({ streaming: true }),
    solid({ ssr: true }),
  ],
  build: {
    minify: false,
  },
})
