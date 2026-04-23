import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    'vue',
    'vite',
    'webpack',
    '@rspack/core',
    'rollup',
    'unplugin',
    '@unhead/bundler',
    '@unhead/bundler/vite',
    '@unhead/bundler/webpack',
    '@unhead/bundler/rspack',
    '@unhead/bundler/rollup',
  ],
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/components', name: 'components' },
    { input: 'src/server', name: 'server' },
    { input: 'src/client', name: 'client' },
    { input: 'src/stream/server', name: 'stream/server' },
    { input: 'src/stream/client', name: 'stream/client' },
    { input: 'src/types/index', name: 'types' },
    { input: 'src/plugins', name: 'plugins' },
    { input: 'src/scripts', name: 'scripts' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/vite', name: 'vite' },
    { input: 'src/webpack', name: 'webpack' },
    { input: 'src/rspack', name: 'rspack' },
    { input: 'src/rollup', name: 'rollup' },
    { input: 'src/stream/iife', name: 'stream/iife' },
    { input: 'src/legacy', name: 'legacy' },
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
})
