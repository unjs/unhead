import { defineBuildConfig } from 'unbuild'

const externals = [
  'vue',
  'vite',
  'webpack',
  'unplugin',
  '@unhead/bundler',
  '@unhead/bundler/vite',
  '@unhead/bundler/framework',
]

export default defineBuildConfig([{
  // The lazy head builds first and alone, so the dist of every other entry stays as it was.
  // The package exports of the next build do not exist yet, so warnings pass here.
  externals,
  clean: true,
  declaration: true,
  failOnWarn: false,
  entries: [
    { input: 'src/lazy', name: 'lazy' },
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
}, {
  clean: false,
  externals,
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
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
}])
