import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  externals: [
    'citty',
    'eslint',
    'pathe',
    'tinyglobby',
    'unhead',
    'unhead/validate',
    '@unhead/eslint-plugin',
  ],
})
