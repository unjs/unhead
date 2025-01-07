import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/optionalPlugins/index', name: 'optionalPlugins' },
  ],
})
