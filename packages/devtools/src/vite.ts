/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { getConfigRpc } from './rpc'

const HEAD_COMPOSABLES = ['useHead', 'useSeoMeta', 'useHeadSafe', 'useScript']
const HEAD_FACTORIES = ['createHead']
const FILE_RE = /\.(vue|tsx?|jsx?|svelte)$/

const UNHEAD_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2300dc82' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39'/%3E%3C/svg%3E`

const DEVTOOLS_UI_ROUTE = '/__unhead/'

function hasHeadCode(code: string): boolean {
  return HEAD_COMPOSABLES.some(c => code.includes(c)) || HEAD_FACTORIES.some(c => code.includes(c))
}

/**
 * Transforms source code to inject `_source` metadata into head composable calls.
 */
function transformSourceLocations(code: string, id: string, root: string): { code: string, map: any } | undefined {
  if (!hasHeadCode(code))
    return

  const s = new MagicString(code)
  let transformed = false

  const relativePath = id.startsWith(root)
    ? id.slice(root.length).replace(/^\//, '')
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

      // Detect createHead() and wrap to expose on window for the bridge
      if (name && HEAD_FACTORIES.includes(name)) {
        s.prependLeft(node.start, `((_h)=>(typeof window!=='undefined'&&(window.__unhead_devtools__=_h),_h))(`)
        s.appendRight(node.end, `)`)
        transformed = true
        return
      }

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

export function unheadDevtools(): Plugin {
  let root = ''
  let bridgeCode: string | undefined
  const pkgDir = fileURLToPath(new URL('..', import.meta.url))

  return {
    name: '@unhead/devtools',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      const bridgePath = resolve(pkgDir, 'dist/bridge.mjs')
      if (existsSync(bridgePath))
        bridgeCode = readFileSync(bridgePath, 'utf-8')
    },

    configureServer(server) {
      // Bridge middleware
      server.middlewares.use('/@unhead/bridge.mjs', async (_req, res) => {
        const result = await server.transformRequest('/@unhead/bridge.mjs')
        res.setHeader('Content-Type', 'application/javascript')
        res.end(result?.code || 'console.warn("[unhead devtools] bridge not built")')
      })
    },

    resolveId(id) {
      if (id === '/@unhead/bridge.mjs')
        return id
    },

    load(id) {
      if (id !== '/@unhead/bridge.mjs')
        return
      if (!bridgeCode)
        return 'console.warn("[unhead devtools] bridge not built")'
      const kitClientPath = resolve(pkgDir, 'node_modules/@vitejs/devtools-kit/dist/client.js')
      if (existsSync(kitClientPath))
        return bridgeCode.replace(`'@vitejs/devtools-kit/client'`, `'${kitClientPath}'`)
      return bridgeCode
    },

    transform: {
      filter: { id: FILE_RE },
      handler(code, id) {
        return transformSourceLocations(code, id, root)
      },
    },

    transformIndexHtml() {
      return [{
        tag: 'script',
        attrs: { type: 'module' },
        children: `import("/@unhead/bridge.mjs")`,
        injectTo: 'body-close',
      }]
    },

    devtools: {
      setup(ctx) {
        const clientPath = resolve(pkgDir, '../devtools-app/dist')
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
