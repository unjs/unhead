import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export async function buildFixture(outDir: string) {
  await build({
    configFile: false,
    logLevel: 'silent',
    resolve: {
      dedupe: ['vue'],
      alias: [
        { find: '@unhead/vue/client', replacement: source('../../../src/client.ts') },
        { find: '@unhead/vue', replacement: source('../../../src/index.ts') },
        { find: /^unhead\/(.+)$/, replacement: source('../../../../unhead/src/$1/index.ts') },
        { find: 'unhead', replacement: source('../../../../unhead/src/index.ts') },
      ],
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir,
      emptyOutDir: false,
      lib: { entry: source('./client.ts'), name: 'AttributeFixture', formats: ['iife'], fileName: () => 'client.js' },
    },
  })
}
