import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  externals: ['solid-js'],
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/server', name: 'server' },
    { input: 'src/client', name: 'client' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/plugins', name: 'plugins' },
  ],
})
