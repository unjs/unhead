import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    emitCJS: true,
  },
  externals: ['vue'],
  entries: [
    { input: 'src/index', name: 'index' },
    { builder: 'mkdist', input: 'src/runtime/alias', outDir: 'dist/runtime/alias' },
    { builder: 'mkdist', input: 'src/runtime/server', outDir: 'dist/runtime/server' },
    { builder: 'mkdist', input: 'src/runtime/client', outDir: 'dist/runtimes/client' },
  ],
})
