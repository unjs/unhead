import type { ConfigEnv, UserConfig } from 'vite'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'

const UNHEAD_MODULE_RE = /[\\/]node_modules[\\/](?:@unhead[\\/][^\\/]+|unhead)[\\/]/
const HEAD_SSR_RE = /\bhead\.ssr\b/g
const JS_RE = /\.(?:c|m)?js$/

export const SSRStaticReplace = createUnplugin<Record<string, never>, false>(() => {
  let ssr = false

  return {
    name: 'unhead:ssr-static-replace',
    enforce: 'pre',

    transformInclude(id) {
      if (!UNHEAD_MODULE_RE.test(id))
        return false
      return JS_RE.test(id)
    },

    transform(code) {
      if (!code.includes('head.ssr'))
        return

      const s = new MagicString(code)
      for (const match of code.matchAll(HEAD_SSR_RE)) {
        s.overwrite(match.index!, match.index! + match[0].length, String(ssr))
      }

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true }),
        }
      }
    },

    webpack(ctx) {
      if (ctx.name === 'server')
        ssr = true
    },
    vite: {
      apply(_config: UserConfig, env: ConfigEnv): boolean {
        if (env.isSsrBuild)
          ssr = true
        return true
      },
    },
  }
})
