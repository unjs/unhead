import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  externals: [
    'eslint',
    'unhead',
    'unhead/validate',
  ],
})
