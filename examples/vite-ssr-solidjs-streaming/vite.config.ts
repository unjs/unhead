import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { unheadSolidPlugin } from '@unhead/solid-js/stream/vite'

export default defineConfig({
  plugins: [
    // MUST come before solid() to see JSX before it's compiled to function calls
    unheadSolidPlugin(),
    solid({ ssr: true }),
  ],
  build: {
    minify: false,
  },
})
