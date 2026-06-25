import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { walk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { createJsVueTransformIdFilter, isVueScriptRequest, NODE_MODULES_RE, splitTransformId } from './utils'

const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/
const SERVER_COMPOSABLE_RE = /\b(?:useServerHead|useServerHeadSafe|useServerSeoMeta|useSchemaOrg)\b/

const functionNames = [
  'useServerHead',
  'useServerHeadSafe',
  'useServerSeoMeta',
  // plugins
  'useSchemaOrg',
]

export interface TreeshakeServerComposablesOptions extends BaseTransformerTypes {
  /**
   * @deprecated Use `treeshake: false` at the top level instead.
   */
  enabled?: boolean
}

export const TreeshakeServerComposables = createUnplugin<TreeshakeServerComposablesOptions, false>((options: TreeshakeServerComposablesOptions = {}) => {
  options.enabled = options.enabled !== undefined ? options.enabled : true

  function shouldTransformId(id: string): boolean {
    // should only run on client builds
    if (!options.enabled)
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
        if (!shouldTransformId(id))
          return

        if (!shouldTransformCode(code)) {
          return
        }

        const ast = parseSync(id, code)
        const s = new MagicString(code)

        walk(ast.program, {
          enter(node: any) {
            if (
              node.type === 'ExpressionStatement'
              && node.expression.type === 'CallExpression'
              && node.expression.callee.type === 'Identifier'
              && functionNames.includes(node.expression.callee.name)
            ) {
              s.remove(node.start, node.end)
            }
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
      if (ctx.name === 'server')
        options.enabled = false
    },
    vite: {
      apply(config: UserConfig, env: ConfigEnv) {
        if (env.isSsrBuild) {
          options.enabled = false
          return true
        }
        return false
      },
    },
  }
})
