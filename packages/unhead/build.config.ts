import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
  },
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/types/index', name: 'types' },
    { input: 'src/legacy', name: 'legacy' },
    { input: 'src/server/index', name: 'server' },
    { input: 'src/client/index', name: 'client' },
    { input: 'src/stream/server', name: 'stream/server' },
    { input: 'src/stream/client', name: 'stream/client' },
    { input: 'src/scripts/index', name: 'scripts' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/plugins/index', name: 'plugins' },
    { input: 'src/parser/index', name: 'parser' },
    { input: 'src/stream/vite', name: 'stream/vite' },
  ],
})
