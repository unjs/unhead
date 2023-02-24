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
  let enabled = false

  return {
    name: 'unhead:remove-server-composables',
    enforce: 'post',

    transformInclude(id) {
      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type } = parseQuery(search)

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
        return null

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
      if (ctx.name !== 'server')
        enabled = true
    },
    vite: {
      async config(config) {
        root = root || config.root || process.cwd()
      },
      apply(config: UserConfig, env: ConfigEnv) {
        if (!env.ssrBuild) {
          enabled = true
          return true
        }
        return false
      },
    },
  }
})
