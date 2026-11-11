/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import type { HeadTransformContext } from '../unplugin/CreateHeadTransform'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import MagicString from 'magic-string'
import { parseAndWalkSource } from '../unplugin/parser'
import { SOURCE_FILE_RE } from '../unplugin/utils'
import { createUnheadDevframe, findPkgRoot } from './devframe'
import { HEAD_COMPOSABLE_RE, HEAD_COMPOSABLES } from './filter'

const LEADING_SLASH_RE = /^\//
const BACKSLASH_RE = /\\/g

function isViteDevtoolsPlugin(plugin: { name?: string }): boolean {
  return !!plugin.name?.startsWith('vite:devtools')
}

function isViteDevtoolsEnabled(config: { devtools?: false | { enabled?: boolean }, plugins: readonly { name?: string }[] }): boolean {
  return (config.devtools && config.devtools.enabled === true) || config.plugins.some(isViteDevtoolsPlugin)
}

/**
 * Absolute path to this package's runtime entry (which exports `devtoolsPlugin`).
 *
 * This is needed for projects that do not have `@unhead/bundler` as an explicit dep.
 */
function resolveRuntimeEntry(pkgDir: string): string {
  const candidates = [
    resolve(pkgDir, 'dist/index.mjs'),
    // running from source (repo tests, unbuilt workspace)
    resolve(pkgDir, 'src/index.ts'),
  ]
  return (candidates.find(existsSync) ?? candidates[0]).replace(BACKSLASH_RE, '/')
}

/**
 * Transforms source code to inject `_source` metadata into head composable calls.
 */
function transformSourceLocations(code: string, id: string, root: string): { code: string, map: any } | undefined {
  const s = new MagicString(code)
  let transformed = false

  const relativePath = id.startsWith(root)
    ? id.slice(root.length).replace(LEADING_SLASH_RE, '')
    : id

  parseAndWalkSource(code, id, {
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

export interface UnheadDevtoolsInternalOptions {
  _ctx?: HeadTransformContext
}

export function unheadDevtools(options?: UnheadDevtoolsInternalOptions): Plugin {
  let root = ''
  let enabled = false
  let runtimePluginRegistered = false
  const pkgDir = findPkgRoot(import.meta.url)

  return {
    name: '@unhead/devtools',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      enabled = isViteDevtoolsEnabled(config)
      if (!enabled)
        return

      // Register runtime plugins via the shared context
      if (options?._ctx && !runtimePluginRegistered) {
        options._ctx.addRuntimePlugin({
          import: { name: 'devtoolsPlugin', source: resolveRuntimeEntry(pkgDir), as: '__unhead_devtoolsPlugin' },
          client: 'window.__unhead_devtools__=_h',
          server: '_h.use(__unhead_devtoolsPlugin())',
        })
        runtimePluginRegistered = true
      }
    },

    transform: {
      filter: { id: SOURCE_FILE_RE, code: HEAD_COMPOSABLE_RE },
      handler(code, id) {
        if (!enabled)
          return
        return transformSourceLocations(code, id, root)
      },
    },

    // Mounts the panel, the page script (dock client script), and the RPC.
    devtools: createPluginFromDevframe(createUnheadDevframe()).devtools,
  }
}

export default unheadDevtools
