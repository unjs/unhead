import { Buffer } from 'node:buffer'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

function shellBuild(name: 'lazy' | 'lazy-switch' | 'lazy-stream-switch' | 'lazy-framework') {
  return {
    entries: [`src/vue-client/${name}`],
    outDir: `dist/vue-client-${name}`,
    failOnWarn: false,
    // a production build, so the dev warning must leave no code
    replace: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    rollup: {
      inlineDependencies: true,
      esbuild: {
        treeShaking: true,
        minify: true,
      },
      alias: {
        entries: [
          { find: '@unhead/vue/lazy', replacement: path.join(packagesDir, 'vue/dist/lazy.mjs') },
          { find: 'unhead/lazy', replacement: path.join(packagesDir, 'unhead/dist/lazy.mjs') },
          { find: '@unhead/vue/client', replacement: path.join(packagesDir, 'vue/dist/client.mjs') },
          { find: '@unhead/vue', replacement: path.join(packagesDir, 'vue/dist/index.mjs') },
          { find: 'unhead/client', replacement: path.join(packagesDir, 'unhead/dist/client.mjs') },
          { find: 'unhead/server', replacement: path.join(packagesDir, 'unhead/dist/server.mjs') },
          { find: 'unhead/plugins', replacement: path.join(packagesDir, 'unhead/dist/plugins.mjs') },
          { find: 'unhead/scripts', replacement: path.join(packagesDir, 'unhead/dist/scripts.mjs') },
          { find: 'unhead/utils', replacement: path.join(packagesDir, 'unhead/dist/utils.mjs') },
          { find: 'unhead', replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
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
        config.experimentalLogSideEffects = true
        config.plugins.push(visualizer({
          emitFile: true,
          filename: 'stats.html',
        }))
        config.plugins.push({
          name: 'vue-lazy-startup-size',
          generateBundle(_, bundle) {
            const seen = new Set(['vue'])
            let size = 0
            let compressed = 0
            function measure(name: string) {
              if (seen.has(name))
                return
              seen.add(name)
              const chunk = bundle[name]
              if (chunk?.type !== 'chunk')
                throw new Error(`The lazy shell references an unmeasured startup module: ${name}`)
              size += Buffer.byteLength(chunk.code)
              compressed += zlib.gzipSync(chunk.code).length
              chunk.imports.forEach(measure)
            }
            measure(`vue-client/${name}.mjs`)
            if (compressed >= 1000)
              throw new Error(`The production Vue lazy shell is ${compressed} B gzip. Keep it below 1000 B.`)
            console.log(`VUE CLIENT ${name} Size: ${size} B (gzipped: ${compressed} B)`)
          },
        })
      },
    },
  } satisfies Parameters<typeof defineBuildConfig>[0]
}

export default defineBuildConfig([shellBuild('lazy'), shellBuild('lazy-switch'), shellBuild('lazy-stream-switch'), shellBuild('lazy-framework')])
