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
    { input: 'src/v4/index', name: 'v4' },
    { input: 'src/v4/compiled', name: 'v4/compiled' },
    { input: 'src/v4/client', name: 'v4/client' },
    { input: 'src/v4/client-compiled', name: 'v4/client-compiled' },
    { input: 'src/v4/server', name: 'v4/server' },
    { input: 'src/v4/server-compiled', name: 'v4/server-compiled' },
    { input: 'src/v4/plugins', name: 'v4/plugins' },
    { input: 'src/v4/utils', name: 'v4/utils' },
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
})
