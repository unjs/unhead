import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { createJsVueTransformIdFilter, isVueScriptRequest, NODE_MODULES_RE, resolveBuildConsumer, splitTransformId } from './utils'

const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/
const SERVER_COMPOSABLE_RE = /\b(?:useServerHead|useServerHeadSafe|useServerSeoMeta|useSchemaOrg)\b/

const functionNames = new Set([
  'useServerHead',
  'useServerHeadSafe',
  'useServerSeoMeta',
  // plugins
  'useSchemaOrg',
])

function isUnheadPackage(source: unknown): boolean {
  return typeof source === 'string'
    && (source === 'unhead' || source.startsWith('unhead/') || source.startsWith('@unhead/'))
}

export interface TreeshakeServerComposablesOptions extends BaseTransformerTypes {
  /**
   * @deprecated Use `treeshake: false` at the top level instead.
   */
  enabled?: boolean
}

export const TreeshakeServerComposables = createUnplugin<TreeshakeServerComposablesOptions, false>((options: TreeshakeServerComposablesOptions = {}) => {
  const enabled = options.enabled ?? true
  // Fallback build target for bundlers without a per-transform environment
  // (webpack, rspack, Vite <6). Those bundlers create a separate plugin
  // instance per build, so instance-local state is safe there. Under the Vite
  // Environment API (`this.environment`) the target is resolved per transform
  // call instead, since a single plugin instance can serve both the client
  // and server environments in one pipeline.
  let fallbackConsumer: BuildConsumer | undefined

  function shouldTransformId(id: string): boolean {
    if (!enabled)
      return false

    const { pathname, query } = splitTransformId(id)

    if (NODE_MODULES_RE.test(pathname))
      return false

    // Included
    if (options.filter?.include?.some(pattern => id.match(pattern)))
      return true

    // Excluded
    if (options.filter?.exclude?.some(pattern => id.match(pattern)))
      return false

    // vue files
    if (isVueScriptRequest(pathname, query))
      return true

    // js files
    if (TRANSFORM_RE.test(pathname))
      return true

    return false
  }

  function shouldTransformCode(code: string): boolean {
    return SERVER_COMPOSABLE_RE.test(code)
  }

  return {
    name: 'unhead:remove-server-composables',
    enforce: 'post',
    transformInclude: shouldTransformId,

    transform: {
      filter: {
        code: SERVER_COMPOSABLE_RE,
        id: createJsVueTransformIdFilter(options.filter?.include),
      },
      handler(code, id) {
        // Server-only composables are treeshaken from client builds only. On
        // an unknown target (plain rollup, no environment info) we must
        // retain the code, removing it would break SSR output.
        if (resolveBuildConsumer(this, fallbackConsumer) !== 'client')
          return

        if (!shouldTransformId(id))
          return

        if (!shouldTransformCode(code)) {
          return
        }

        const scopeTracker = new ScopeTracker()
        const ast = parseSync(id, code)
        const s = new MagicString(code)

        walk(ast.program, {
          scopeTracker,
          enter(node: any, parent: any) {
            // Only remove statement-level calls: `useServerHead(...)` as its
            // own expression statement. Nested usage (assignments, arguments)
            // is left untouched.
            if (
              parent?.type !== 'ExpressionStatement'
              || node.type !== 'CallExpression'
              || node.callee.type !== 'Identifier'
            ) {
              return
            }

            const decl = scopeTracker.getDeclaration(node.callee.name)

            if (decl instanceof ScopeTrackerImport) {
              // Proven unhead import (supports aliases: `import { useServerHead as x }`).
              if (
                decl.node.type === 'ImportSpecifier'
                && decl.node.imported.type === 'Identifier'
                && functionNames.has(decl.node.imported.name)
                && isUnheadPackage(decl.importNode.source.value)
              ) {
                s.remove(parent.start, parent.end)
              }
              return
            }

            // Any local declaration (function/var/param) shadows the
            // composable name: retain the call.
            if (decl)
              return

            // No declaration in scope: treat a known name as an auto-import
            // (e.g. Nuxt) and remove it.
            if (functionNames.has(node.callee.name))
              s.remove(parent.start, parent.end)
          },
        })

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ includeContent: true, source: id }),
          }
        }
      },
    },
    webpack(ctx) {
      fallbackConsumer = ctx.name === 'server' ? 'server' : 'client'
    },
    vite: {
      // Per-call target resolution via `this.environment` makes the plugin
      // safe to share across environments in a single build pipeline.
      sharedDuringBuild: true,
      apply(_config: UserConfig, env: ConfigEnv) {
        // Dev server shares one module graph between client and SSR renders;
        // treeshaking is a build-only optimization.
        if (env.command === 'serve')
          return false
        fallbackConsumer = env.isSsrBuild ? 'server' : 'client'
        return true
      },
    },
  }
})
