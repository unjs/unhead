import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    inlineDependencies: true,
    emitCJS: true,
  },
  externals: ['vue'],
  entries: [
    { input: 'src/index', name: 'index' },
  ],
})
