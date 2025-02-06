import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index' },
    { input: 'src/vue/index', name: 'vue' },
    { input: 'src/react/index', name: 'react' },
  ],
  externals: ['vue', 'react'],
})
