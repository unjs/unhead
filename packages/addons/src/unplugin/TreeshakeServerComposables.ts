import { pathToFileURL } from 'node:url'
import { parseQuery, parseURL } from 'ufo'
import { createUnplugin } from 'unplugin'
import { transform } from 'unplugin-ast'
import type { CallExpression } from '@babel/types'
import type { Transformer } from 'unplugin-ast'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'

function RemoveFunctions(functionNames: string[]): Transformer<CallExpression> {
  return {
    onNode: node => node.type === 'CallExpression'
      && node.callee.type === 'Identifier'
      && functionNames.includes(node.callee.name),
    transform() {
      return false
    },
  }
}

export interface TreeshakeServerComposablesOptions extends BaseTransformerTypes {
  enabled?: boolean
}

export const TreeshakeServerComposables = createUnplugin<TreeshakeServerComposablesOptions, false>((options: TreeshakeServerComposablesOptions = {}) => {
  options.enabled = options.enabled !== undefined ? options.enabled : true

  return {
    name: 'unhead:remove-server-composables',
    enforce: 'post',

    transformInclude(id) {
      // should only run on client builds
      if (!options.enabled)
        return false

      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type } = parseQuery(search)

      if (pathname.match(/[\\/]node_modules[\\/]/))
        return false

      // Included
      if (options.filter?.include?.some(pattern => id.match(pattern)))
        return true

      // Excluded
      if (options.filter?.exclude?.some(pattern => id.match(pattern)))
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
      ) {
        return
      }

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
        options.enabled = false
    },
    vite: {
      apply(config: UserConfig, env: ConfigEnv) {
        // @ts-expect-error Vite 4 support
        if (env.ssrBuild || env.isSsrBuild) {
          options.enabled = false
          return true
        }
        return false
      },
    },
  }
})
