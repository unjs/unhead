// With Unhead Vite plugin: same source as `vue-client-seo-build.config.ts` but
// runs every UseSeoMetaTransform + SSRStaticReplace + TreeshakeServerComposables
// via unplugin's rollup adapter before bundling. Measures the bundle savings
// the unified `@unhead/{framework}/vite` plugin actually delivers.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { SSRStaticReplace } from '../../packages/bundler/src/unplugin/SSRStaticReplace'
import { TreeshakeServerComposables } from '../../packages/bundler/src/unplugin/TreeshakeServerComposables'
import { UseSeoMetaTransform } from '../../packages/bundler/src/unplugin/UseSeoMetaTransform'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: [
    'src/vue-client/minimal-seo',
  ],
  outDir: 'dist/vue-client-seo-plugin',
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
    'rollup:options': (ctx, config) => {
      config.plugins.unshift(
        UseSeoMetaTransform.rollup({}),
        TreeshakeServerComposables.rollup({}),
        SSRStaticReplace.rollup({}),
      )
    },
    'build:done': () => {
      const file = path.resolve(__dirname, 'dist/vue-client-seo-plugin/vue-client/minimal-seo.mjs')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      console.log(`VUE CLIENT SEO (with Unhead Vite plugin) Size: ${size} bytes (${Math.round(size / 102.4) / 10} kB) gzipped: ${compressed} bytes (${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
