import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/unplugin/vite', name: 'vite' },
    { input: 'src/unplugin/webpack', name: 'webpack' },
    { input: 'src/minify/rolldown', name: 'minify/rolldown' },
    { input: 'src/minify/esbuild', name: 'minify/esbuild' },
    { input: 'src/minify/lightningcss', name: 'minify/lightningcss' },
  ],
  externals: [
    'vite',
    'webpack',
    'rollup',
    'unhead',
    'unplugin',
    'unhead/plugins',
    'unhead/minify',
    'unhead/utils',
    'esbuild',
    'lightningcss',
    'rolldown',
  ],
})
