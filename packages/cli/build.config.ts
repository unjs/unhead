import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/migrate/index', name: 'migrate' },
    { input: 'src/cli', name: 'cli' },
  ],
  externals: [
    'citty',
    'magic-string',
    'oxc-parser',
    'oxc-walker',
    'pathe',
    'tinyglobby',
  ],
})
