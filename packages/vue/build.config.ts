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
    { input: 'src/VueUseHeadPolyfill', name: 'polyfill' },
    { input: 'src/vue2/index', name: 'vue2' },
    { input: 'src/components/index', name: 'components' },
  ],
})
