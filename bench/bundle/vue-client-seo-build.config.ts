// Baseline: builds the realistic useSeoMeta source WITHOUT the Unhead Vite plugin.
// Pair with `vue-client-seo-plugin-build.config.ts` (same source, transforms applied)
// to measure what the unified Vite plugin actually saves.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: [
    'src/vue-client/minimal-seo',
  ],
  outDir: 'dist/vue-client-seo',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: '@unhead/vue/client', replacement: path.join(packagesDir, 'vue/dist/client.mjs') },
        { find: '@unhead/vue', replacement: path.join(packagesDir, 'vue/dist/index.mjs') },
        { find: 'unhead/client', replacement: path.join(packagesDir, 'unhead/dist/client.mjs') },
        { find: 'unhead/server', replacement: path.join(packagesDir, 'unhead/dist/server.mjs') },
        { find: 'unhead/plugins', replacement: path.join(packagesDir, 'unhead/dist/plugins.mjs') },
        { find: 'unhead/scripts', replacement: path.join(packagesDir, 'unhead/dist/scripts.mjs') },
        { find: 'unhead/utils', replacement: path.join(packagesDir, 'unhead/dist/utils.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
        { find: 'unhead/parser', replacement: path.join(packagesDir, 'unhead/dist/parser.mjs') },
        { find: 'unhead/minify', replacement: path.join(packagesDir, 'unhead/dist/minify.mjs') },
        { find: /^unhead$/, replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  externals: [
    'hookable',
    'vue',
  ],
  declaration: false,
  hooks: {
    'build:done': () => {
      const file = path.resolve(__dirname, 'dist/vue-client-seo/vue-client/minimal-seo.mjs')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      console.log(`VUE CLIENT SEO (baseline) Size: ${size} bytes (${Math.round(size / 102.4) / 10} kB) gzipped: ${compressed} bytes (${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
