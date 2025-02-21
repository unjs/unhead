import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index' },
    { input: 'src/vue/index', name: 'vue' }, // ships components
    { input: 'src/svelte', name: 'svelte' },
    { input: 'src/react', name: 'react' },
  ],
  externals: [
    'vue',
    '@vue/runtime-core',
    'unplugin-vue-components',
    'unhead',
    'vite',
    'react',
    'svelte',
    'vue-router',
    '@unhead/vue',
    'unplugin-ast',
    'unplugin',
    'unplugin-vue-components',
    'vue',
    '@vue/runtime-core',
  ],
})
