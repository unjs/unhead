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
    { input: 'src/legacy', name: 'legacy' },
    { input: 'src/vue-legacy', name: 'vue-legacy' },
  ],
  externals: [
    'vue',
    '@vue/runtime-core',
    'unplugin-vue-components',
    'unhead',
    '@unhead/vue',
    '@unhead/schema',
    'vite',
    'vue-router',
    '@unhead/vue',
    '@unhead/schema',
    'unplugin-ast',
    'unplugin',
    'unplugin-vue-components',
    'vue',
    '@vue/runtime-core',
  ],
})
