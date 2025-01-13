import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  rollup: {
    preserveDynamicImports: true,
    inlineDependencies: true,
    output: {
      compact: true,
    },
  },
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  hooks: {
    'rollup:options': (_, options) => {
      options.plugins.unshift({
        name: 'webworker',
        resolveId(id) {
          if (id === 'web-worker:./webWorkerWorker') {
            console.log('id', id)
            return './webWorkerWorker'
          }
        },
        load(id) {
          if (id === 'web-worker:./webWorkerWorker') {
            return 'export * from "./src/webworker"'
          }
        },
      })
      console.log(options.plugins)
    },
  },
})
