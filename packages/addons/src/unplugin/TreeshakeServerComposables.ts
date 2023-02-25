import { pathToFileURL } from 'node:url'
import { createUnplugin } from 'unplugin'
import type { Transformer } from 'unplugin-ast'
import { transform } from 'unplugin-ast'
import type { CallExpression } from '@babel/types'
import type { ConfigEnv, UserConfig } from 'vite'
import { parseQuery, parseURL } from 'ufo'

const RemoveFunctions = (functionNames: string[]): Transformer<CallExpression> => ({
  onNode: node =>
    node.type === 'CallExpression'
    && node.callee.type === 'Identifier'
    && functionNames.includes(node.callee.name),
  transform() {
    return false
  },
})

export const TreeshakeServerComposables = createUnplugin(() => {
  let enabled = true

  return {
    name: 'unhead:remove-server-composables',
    enforce: 'post',

    transformInclude(id) {
      // should only run on client builds
      if (!enabled)
        return false

      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type } = parseQuery(search)

      if (pathname.includes('node_modules'))
        return false

      // vue files
      if (pathname.endsWith('.vue') && (type === 'script' || !search))
        return true

      // js files
      if (pathname.match(/\.((c|m)?j|t)sx?$/g))
        return true

      return false
    },

    async transform(code, id) {
      if (
        !code.includes('useServerHead')
        && !code.includes('useServerHeadSafe')
        && !code.includes('useServerSeoMeta')
        && !code.includes('useSchemaOrg')
      )
        return

      let transformed
      try {
        transformed = await transform(code, id, {
          parserOptions: {},
          transformer: [
            RemoveFunctions([
              'useServerHead',
              'useServerHeadSafe',
              'useServerSeoMeta',
              // plugins
              'useSchemaOrg',
            ]),
          ],
        })
      }
      // safely fail
      catch (e) {}
      return transformed
    },
    webpack(ctx) {
      if (ctx.name === 'server')
        enabled = false
    },
    vite: {
      apply(config: UserConfig, env: ConfigEnv) {
        if (env.ssrBuild) {
          enabled = false
          return true
        }
        return false
      },
    },
  }
})
