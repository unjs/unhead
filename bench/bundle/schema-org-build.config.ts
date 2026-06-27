import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/schema-org/minimal',
    'src/schema-org/imports',
    'src/schema-org/vue-meta',
  ],
  outDir: 'dist/schema-org',
  failOnWarn: false,
  alias: {
    '@unhead/schema-org/imports': path.resolve(__dirname, '../../packages/schema-org/src/imports'),
    '@unhead/schema-org/vue/meta': path.resolve(__dirname, '../../packages/schema-org/src/vue/meta'),
    '@unhead/schema-org': path.resolve(__dirname, '../../packages/schema-org/src/index'),
    'unhead/server': path.resolve(__dirname, '../../packages/unhead/src/server/index'),
    'unhead/plugins': path.resolve(__dirname, '../../packages/unhead/src/plugins/index'),
    'unhead/utils': path.resolve(__dirname, '../../packages/unhead/src/utils/index'),
    'unhead': path.resolve(__dirname, '../../packages/unhead/src/index'),
  },
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
  },
  externals: [
    'hookable',
  ],
  declaration: false,
  hooks: {
    'rollup:options': (ctx, config) => {
      config.plugins.push(visualizer({
        emitFile: true,
        filename: 'stats.html',
      }))
    },
    'build:done': () => {
      for (const [label, fileName] of [
        ['SCHEMA-ORG', 'minimal.mjs'],
        ['SCHEMA-ORG IMPORTS', 'imports.mjs'],
        ['SCHEMA-ORG VUE META', 'vue-meta.mjs'],
      ] as const) {
        const file = path.resolve(__dirname, `dist/schema-org/schema-org/${fileName}`)
        const contents = fs.readFileSync(file)
        const size = contents.length
        const compressed = zlib.gzipSync(contents).length
        console.log(`${label} Size: ${Math.round(size / 102.4) / 10} kB (gzipped: ${Math.round(compressed / 102.4) / 10} kB)`)
      }
    },
  },
})
