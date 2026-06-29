/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import type { HeadTransformContext } from '../unplugin/CreateHeadTransform'
import type { UnheadDevtoolsOptions } from '../unplugin/types'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { getConfigRpc, runLintRpc } from './rpc'

const HEAD_COMPOSABLES = ['useHead', 'useSeoMeta', 'useHeadSafe', 'useScript']
const HEAD_COMPOSABLE_RE = new RegExp(`\\b(?:${HEAD_COMPOSABLES.join('|')})\\b`)
const FILE_RE = /\.(vue|tsx?|jsx?|svelte)$/
const LEADING_SLASH_RE = /^\//
const UNHEAD_VERSION_RE = /__UNHEAD_VERSION__ = ['"]'?["']/

function isViteDevtoolsPlugin(plugin: { name?: string }): boolean {
  return !!plugin.name?.startsWith('vite:devtools')
}

function isViteDevtoolsEnabled(config: { devtools?: { enabled?: boolean }, plugins: readonly { name?: string }[] }): boolean {
  return config.devtools?.enabled === true || config.plugins.some(isViteDevtoolsPlugin)
}

/**
 * Resolve the `@unhead/bundler` package root by walking up from this module.
 *
 * unbuild may code-split the devtools plugin into `dist/shared/*.mjs` rather
 * than emitting it as `dist/vite.mjs`, so we can't assume a fixed depth from
 * `import.meta.url`. Walking up to the nearest `package.json` works whichever
 * chunk this code ends up in (dist/vite.mjs, dist/shared/*.mjs, or stubbed src).
 */
function findPkgRoot(fromUrl: string): string {
  let dir = dirname(fileURLToPath(fromUrl))
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'package.json')))
      return dir
    dir = dirname(dir)
  }
  return dir
}

const UNHEAD_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FBBF24'/%3E%3Cstop offset='100%25' stop-color='%23f0db4f'/%3E%3C/linearGradient%3E%3Cmask id='m'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Cpath d='M12 32 L1 32 L15 15 Z' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Cpath fill='none' stroke='url(%23g)' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4' mask='url(%23m)'/%3E%3C/svg%3E`

const DEVTOOLS_UI_ROUTE = '/__unhead/'

/**
 * Transforms source code to inject `_source` metadata into head composable calls.
 */
function transformSourceLocations(code: string, id: string, root: string): { code: string, map: any } | undefined {
  if (!HEAD_COMPOSABLE_RE.test(code))
    return

  const s = new MagicString(code)
  let transformed = false

  const relativePath = id.startsWith(root)
    ? id.slice(root.length).replace(LEADING_SLASH_RE, '')
    : id

  parseAndWalk(code, id, {
    parseOptions: { lang: 'ts' },
    enter(node: any) {
      if (node.type !== 'CallExpression')
        return
      const callee = node.callee
      if (!callee)
        return

      const name = callee.type === 'Identifier'
        ? callee.name
        : callee.type === 'MemberExpression' && callee.property?.type === 'Identifier'
          ? callee.property.name
          : null

      if (!name || !HEAD_COMPOSABLES.includes(name))
        return

      const args = node.arguments
      if (!args || args.length === 0)
        return

      const lineNumber = code.slice(0, node.start).split('\n').length
      const sourceValue = `${relativePath}:${lineNumber}`

      if (args.length === 1) {
        const argEnd = args[0].end
        s.appendRight(argEnd, `, { _source: ${JSON.stringify(sourceValue)} }`)
        transformed = true
      }
      else if (args.length >= 2 && args[1].type === 'ObjectExpression') {
        const objStart = args[1].start + 1
        s.appendRight(objStart, ` _source: ${JSON.stringify(sourceValue)},`)
        transformed = true
      }
    },
  })

  if (!transformed)
    return

  return {
    code: s.toString(),
    map: s.generateMap({ includeContent: true, source: id }),
  }
}

export interface UnheadDevtoolsInternalOptions extends UnheadDevtoolsOptions {
  _ctx?: HeadTransformContext
}

export function unheadDevtools(options?: UnheadDevtoolsInternalOptions): Plugin {
  let root = ''
  let enabled = false
  let bridgeCode: string | undefined
  let unheadVersion = ''
  const pkgDir = findPkgRoot(import.meta.url)
  const devtoolsUiDir = resolve(pkgDir, 'dist/devtools-ui')

  return {
    name: '@unhead/devtools',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      enabled = isViteDevtoolsEnabled(config)
      if (!enabled)
        return

      // Register runtime plugins via the shared context
      if (options?._ctx) {
        options._ctx.addRuntimePlugin({
          import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__unhead_devtoolsPlugin' },
          client: 'window.__unhead_devtools__=_h',
          server: '_h.use(__unhead_devtoolsPlugin())',
        })
      }

      // Resolve unhead version for the devtools UI. Resolve the `unhead` entry
      // through Node's module resolution then walk up to its package.json, so it
      // works under hoisted and pnpm installs (unhead doesn't export
      // ./package.json, and it isn't nested inside @unhead/bundler).
      try {
        const unheadEntry = createRequire(import.meta.url).resolve('unhead')
        const unheadPkg = resolve(findPkgRoot(pathToFileURL(unheadEntry).href), 'package.json')
        unheadVersion = JSON.parse(readFileSync(unheadPkg, 'utf-8')).version || ''
      }
      catch {
        // Version metadata is optional for devtools; leave it blank if package resolution fails.
      }

      const bridgePath = resolve(pkgDir, 'dist/devtools/bridge.mjs')
      if (existsSync(bridgePath))
        bridgeCode = readFileSync(bridgePath, 'utf-8')
    },

    configureServer(server) {
      if (!enabled)
        return
      // Bridge middleware
      server.middlewares.use('/@unhead/bridge.mjs', async (_req, res) => {
        const result = await server.transformRequest('/@unhead/bridge.mjs')
        res.setHeader('Content-Type', 'application/javascript')
        res.end(result?.code || 'console.warn("[unhead devtools] bridge not built")')
      })
    },

    resolveId(id) {
      if (!enabled)
        return
      if (id === '/@unhead/bridge.mjs')
        return id
    },

    load(id) {
      if (!enabled || id !== '/@unhead/bridge.mjs')
        return
      if (!bridgeCode)
        return 'console.warn("[unhead devtools] bridge not built")'
      let code = bridgeCode
      // Inject unhead version
      if (unheadVersion)

        code = code.replace(UNHEAD_VERSION_RE, `__UNHEAD_VERSION__ = '${unheadVersion}'`)
      const kitClientPath = resolve(pkgDir, 'node_modules/@vitejs/devtools-kit/dist/client.js')
      if (existsSync(kitClientPath))
        return code.replace(`'@vitejs/devtools-kit/client'`, `'${kitClientPath}'`)
      return code
    },

    transform: {
      filter: { id: FILE_RE, code: HEAD_COMPOSABLE_RE },
      handler(code, id) {
        if (!enabled)
          return
        return transformSourceLocations(code, id, root)
      },
    },

    transformIndexHtml: {
      // Run before non-pre HTML transforms so the injected module import
      // goes through the full Vite plugin pipeline.
      order: 'pre',
      handler() {
        if (!enabled)
          return []
        // Inject into head (not body) so that streaming SSR — which splits the
        // template at body boundaries — does not strip the bridge import.
        return [{
          tag: 'script',
          attrs: { type: 'module' },
          children: `import("/@unhead/bridge.mjs")`,
          injectTo: 'head',
        }]
      },
    },

    devtools: {
      setup(ctx) {
        if (existsSync(devtoolsUiDir)) {
          ctx.views.hostStatic(DEVTOOLS_UI_ROUTE, devtoolsUiDir)
        }

        ctx.docks.register({
          id: 'unhead',
          title: 'Unhead',
          icon: UNHEAD_ICON,
          type: 'iframe',
          url: DEVTOOLS_UI_ROUTE,
        })

        ctx.rpc.register(getConfigRpc)
        ctx.rpc.register(runLintRpc)
      },
    },
  }
}

export default unheadDevtools
