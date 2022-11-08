import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    inlineDependencies: true,
  },
  entries: [
    { input: 'src/index', name: 'index' },
  ],
})
