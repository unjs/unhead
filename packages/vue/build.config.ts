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

function logSideEffects(_: unknown, options: { experimentalLogSideEffects?: boolean }) {
  options.experimentalLogSideEffects = true
}

export default defineBuildConfig([{
  // The compiled server head comes from the next build, which then checks the package exports
  failOnWarn: false,
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
  hooks: { 'rollup:options': logSideEffects },
}, {
  // The compiled server head builds alone. It then shares no dist file with the other
  // entries, so their dist stays byte for byte the same.
  clean: false,
  externals,
  declaration: true,
  entries: [
    { input: 'src/compiled/server', name: 'compiled/server' },
  ],
  hooks: { 'rollup:options': logSideEffects },
}])
