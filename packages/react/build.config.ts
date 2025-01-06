import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  externals: ['react'],
  entries: [
    { input: 'src/index', name: 'index' },
  ],
})
