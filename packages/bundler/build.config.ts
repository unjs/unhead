import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/unplugin/vite', name: 'vite' },
    { input: 'src/unplugin/framework', name: 'framework' },
    { input: 'src/minify/rolldown', name: 'minify/rolldown' },
    { input: 'src/minify/esbuild', name: 'minify/esbuild' },
    { input: 'src/minify/lightningcss', name: 'minify/lightningcss' },
    { input: 'src/devtools/bridge', name: 'devtools/bridge' },
  ],
  externals: [
    'vite',
    'webpack',
    'unhead',
    'unplugin',
    'unhead/plugins',
    'unhead/minify',
    'unhead/utils',
    'esbuild',
    'lightningcss',
    'rolldown',
    '@vitejs/devtools-kit',
    '@vitejs/devtools-kit/client',
  ],
  hooks: {
    'build:done': async function (ctx) {
      // Inline the devtools-app static output into our dist so consumers
      // don't need @unhead/devtools-app as a runtime dependency. Skip if the
      // source hasn't been built (CI jobs like lint/test don't build it).
      const src = resolve(ctx.options.rootDir, '../devtools-app/dist')
      const dst = resolve(ctx.options.rootDir, 'dist/devtools-ui')
      if (!existsSync(src)) {
        console.warn('[@unhead/bundler] skipping devtools-ui copy: run `pnpm build:devtools-app` first to include it in the bundle')
        return
      }
      await cp(src, dst, { recursive: true })
    },
  },
})
