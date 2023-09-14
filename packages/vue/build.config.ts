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
    { input: 'src/components/index', name: 'components' },
    { input: 'src/composables/index', name: 'composables' },
  ],
})
