import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  rollup: {
    inlineDependencies: true,
    emitCJS: true,
  },
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/unplugin/vite', name: 'vite' },
    { input: 'src/unplugin/webpack', name: 'webpack' },
  ],
  externals: [
    'vite',
    'webpack',
    'rollup',
    'unplugin',
  ],
})
