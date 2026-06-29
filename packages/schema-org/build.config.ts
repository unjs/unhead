import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index' },
    { input: 'src/imports', name: 'imports' },
    { input: 'src/vue/index', name: 'vue' }, // ships components
    { input: 'src/vue/meta', name: 'vue/meta' },
    { input: 'src/svelte', name: 'svelte' },
    { input: 'src/react', name: 'react' },
    { input: 'src/solid-js', name: 'solid-js' },
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
    '@unhead/react',
    '@unhead/solid-js',
    '@unhead/svelte',
    '@unhead/vue',
    'unhead',
    'unhead/utils',
    'unhead/plugins',
  ],
})
