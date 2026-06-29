import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { DevTools } from '@vitejs/devtools'
import { unheadVueComposablesImports } from '@unhead/vue'
import { schemaAutoImports } from '@unhead/schema-org'
import AutoImport from 'unplugin-auto-import/vite'
import { Unhead } from '@unhead/vue/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    DevTools(),
    AutoImport({
      imports: [
        unheadVueComposablesImports,
        'vue',
        'vue-router',
        { '@unhead/vue': ['useScript'] },
        { '@unhead/schema-org/vue': schemaAutoImports },
      ],
    }),
    vue(),
    Unhead(),
  ],
  optimizeDeps: {
    include: ['vue-router'],
  },
  devtools: {
    enabled: true,
    clientAuth: false,
    clientAuthTokens: ['123'],
  }
})
