import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  externals: [
    'packrup',
  ],
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/runtime/client/index', name: 'client' },
    { input: 'src/runtime/server/index', name: 'server' },
  ],
})
