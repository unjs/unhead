import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  entries: [
    { input: 'src/index' },
    { input: 'src/vue/index', name: 'vue' },
  ],
  externals: ['vue'],
})
