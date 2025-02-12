import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/server/minimal',
    // 'src/server/minimal',
    // 'src/full',
  ],
  outDir: 'dist/server',
  failOnWarn: false,
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
  },
})
