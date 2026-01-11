import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: ['vue'],
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
    { input: 'src/stream/vite', name: 'stream/vite' },
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
})
