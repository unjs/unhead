import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index' },
    { input: 'src/vue/index', name: 'vue' },
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
