import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { DevTools } from '@vitejs/devtools'
import { unheadVueComposablesImports } from '@unhead/vue'
import AutoImport from 'unplugin-auto-import/vite'
import { unheadDevtools } from '@unhead/devtools/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    DevTools({ clientAuth: false }),
    AutoImport({
      imports: [
        unheadVueComposablesImports,
        'vue',
      ],
    }),
    vue(),
    unheadDevtools(),
  ],
})
