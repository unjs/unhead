import { createUnplugin } from 'unplugin'
import { createFilter } from '@rollup/pluginutils'
import type { Transformer } from 'unplugin-ast'
import { transform } from 'unplugin-ast'
import type { CallExpression } from '@babel/types'
import type { ConfigEnv, UserConfig } from 'vite'
import type { PluginOptions } from './types'

const RemoveFunctions = (functionNames: string[]): Transformer<CallExpression> => ({
  onNode: node =>
    node.type === 'CallExpression'
    && node.callee.type === 'Identifier'
    && functionNames.includes(node.callee.name),
  transform() {
    return false
  },
})

export const TreeshakeServerComposables = createUnplugin<PluginOptions>((userConfig = {}) => {
  const filter = createFilter([
    /\.[jt]sx?$/,
    /\.vue$/,
  ], [
    'node_modules',
  ])
  let root = userConfig.root

  let enabled = true

  return {
    name: 'unhead:remove-server-composables',
    enforce: 'post',

    transformInclude(id) {
      // make sure we run on files from root
      if (enabled && root && !id.startsWith(root))
        return false
      if (!filter(id))
        return false
    },

    async transform(code, id) {
      if (!code.includes('useServerHead') && !code.includes('useSeoMeta'))
        return null

      let transformed
      try {
        transformed = await transform(code, id, {
          parserOptions: {},
          transformer: [
            RemoveFunctions([
              'useServerHead',
              'useSeoMeta',
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
        enabled = false
    },
    vite: {
      async config(config) {
        root = root || config.root || process.cwd()
      },
      apply(config: UserConfig, env: ConfigEnv) {
        if (!env.ssrBuild) {
          enabled = false
          return false
        }
        return true
      },
    },
  }
})
