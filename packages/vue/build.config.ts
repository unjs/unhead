import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    'vue',
    'vite',
    'webpack',
    'unplugin',
    '@unhead/bundler',
    '@unhead/bundler/vite',
    '@unhead/bundler/framework',
  ],
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/components', name: 'components' },
    { input: 'src/server', name: 'server' },
    { input: 'src/client', name: 'client' },
    { input: 'src/precompiled/index', name: 'precompiled' },
    { input: 'src/precompiled/client', name: 'precompiled/client' },
    { input: 'src/precompiled/client-csr', name: 'precompiled/client-csr' },
    { input: 'src/precompiled/client-deferred', name: 'precompiled/client-deferred' },
    { input: 'src/precompiled/server', name: 'precompiled/server' },
    { input: 'src/stream/server', name: 'stream/server' },
    { input: 'src/stream/client', name: 'stream/client' },
    { input: 'src/types/index', name: 'types' },
    { input: 'src/plugins', name: 'plugins' },
    { input: 'src/scripts', name: 'scripts' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/bundler', name: 'bundler' },
    { input: 'src/vite', name: 'vite' },
    { input: 'src/stream/vite', name: 'stream/vite' },
    { input: 'src/stream/iife', name: 'stream/iife' },
    { input: 'src/legacy', name: 'legacy' },
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
})
