import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { createHead, renderSSRHead } from '../../packages/unhead/src/server'
import { pageHead } from './head'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      'unhead/client': fileURLToPath(new URL('../../packages/unhead/src/client/index.ts', import.meta.url)),
      'unhead/lazy': fileURLToPath(new URL('../../packages/unhead/src/lazy/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: '../../node_modules/.cache/lazy-head-browser',
    emptyOutDir: true,
  },
  plugins: [{
    name: 'head-benchmark-ssr',
    transformIndexHtml(html) {
      const head = createHead({ disableDefaults: true })
      head.push(pageHead('Home'))
      const { headTags } = renderSSRHead(head)
      return html.replace('</head>', `${headTags}</head>`)
    },
  }],
})
