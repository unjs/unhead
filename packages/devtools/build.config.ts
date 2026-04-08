import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/vite', name: 'vite' },
    { input: 'src/plugin', name: 'plugin' },
    { input: 'src/bridge', name: 'bridge' },
  ],
  externals: [
    'vite',
    'unhead',
    '@vitejs/devtools-kit',
    '@vitejs/devtools-kit/client',
  ],
})
