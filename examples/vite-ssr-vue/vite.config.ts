import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { unheadVueComposablesImports } from '@unhead/vue'
import AutoImport from 'unplugin-auto-import/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    AutoImport({
      imports: [
        unheadVueComposablesImports,
        'vue',
      ],
    }),
    vue()
  ],
})
