import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  externals: ['vue'],
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/components/index', name: 'components' },
    { input: 'src/server/index', name: 'server' },
    { input: 'src/client/index', name: 'client' },
  ],
})
