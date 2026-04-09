/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import type { HeadTransformContext } from '../unplugin/CreateHeadTransform'
import type { UnheadDevtoolsOptions } from '../unplugin/types'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { getConfigRpc } from './rpc'

const HEAD_COMPOSABLES = ['useHead', 'useSeoMeta', 'useHeadSafe', 'useScript']
const FILE_RE = /\.(vue|tsx?|jsx?|svelte)$/
const LEADING_SLASH_RE = /^\//

const UNHEAD_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FBBF24'/%3E%3Cstop offset='100%25' stop-color='%23f0db4f'/%3E%3C/linearGradient%3E%3Cmask id='m'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Cpath d='M12 32 L1 32 L15 15 Z' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Cpath fill='none' stroke='url(%23g)' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4' mask='url(%23m)'/%3E%3C/svg%3E`

const DEVTOOLS_UI_ROUTE = '/__unhead/'

/**
 * Transforms source code to inject `_source` metadata into head composable calls.
 */
function transformSourceLocations(code: string, id: string, root: string): { code: string, map: any } | undefined {
  if (!HEAD_COMPOSABLES.some(c => code.includes(c)))
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
  const pkgDir = fileURLToPath(new URL('..', import.meta.url))

  return {
    name: '@unhead/devtools',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      enabled = config.plugins.some(p => p.name?.startsWith('vite:devtools'))
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

      // Resolve unhead version for the devtools UI
      try {
        const unheadPkg = resolve(pkgDir, 'node_modules/unhead/package.json')
        if (existsSync(unheadPkg))
          unheadVersion = JSON.parse(readFileSync(unheadPkg, 'utf-8')).version || ''
      }
      catch {}

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
        // eslint-disable-next-line e18e/prefer-static-regex
        code = code.replace(/__UNHEAD_VERSION__ = ['"]'?["']/, `__UNHEAD_VERSION__ = '${unheadVersion}'`)
      const kitClientPath = resolve(pkgDir, 'node_modules/@vitejs/devtools-kit/dist/client.js')
      if (existsSync(kitClientPath))
        return code.replace(`'@vitejs/devtools-kit/client'`, `'${kitClientPath}'`)
      return code
    },

    transform: {
      filter: { id: FILE_RE },
      handler(code, id) {
        if (!enabled)
          return
        return transformSourceLocations(code, id, root)
      },
    },

    transformIndexHtml() {
      if (!enabled)
        return []
      return [{
        tag: 'script',
        attrs: { type: 'module' },
        children: `import("/@unhead/bridge.mjs")`,
        injectTo: 'body',
      }]
    },

    devtools: {
      setup(ctx) {
        // devtools-app dist is in a sibling package
        const clientPath = resolve(pkgDir, 'node_modules/@unhead/devtools-app/dist')
        if (existsSync(clientPath)) {
          ctx.views.hostStatic(DEVTOOLS_UI_ROUTE, clientPath)
        }

        ctx.docks.register({
          id: 'unhead',
          title: 'Unhead',
          icon: UNHEAD_ICON,
          type: 'iframe',
          url: DEVTOOLS_UI_ROUTE,
        })

        ctx.rpc.register(getConfigRpc)
      },
    },
  }
}

export default unheadDevtools
