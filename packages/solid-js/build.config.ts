import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  externals: ['solid-js', 'vite', 'magic-string', 'oxc-parser', 'oxc-walker', '@unhead/bundler', '@unhead/bundler/vite'],
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/server', name: 'server' },
    { input: 'src/client', name: 'client' },
    { input: 'src/stream/server', name: 'stream/server' },
    { input: 'src/stream/client', name: 'stream/client' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/plugins', name: 'plugins' },
    { input: 'src/vite', name: 'vite' },
    { input: 'src/stream/vite', name: 'stream/vite' },
  ],
})
