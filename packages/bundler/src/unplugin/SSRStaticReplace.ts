import type { ConfigEnv, UserConfig } from 'vite'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'

const UNHEAD_JS_MODULE_RE = /[\\/]node_modules[\\/](?:@unhead[\\/][^\\/]+|unhead)[\\/].*\.(?:c|m)?js$/
const HEAD_SSR_FILTER_RE = /\bhead\.ssr\b/
const HEAD_SSR_RE = new RegExp(HEAD_SSR_FILTER_RE.source, 'g')

export const SSRStaticReplace = createUnplugin<Record<string, never>, false>(() => {
  let ssr = false
  let enabled = true

  function shouldTransformId(id: string): boolean {
    if (!enabled)
      return false
    return UNHEAD_JS_MODULE_RE.test(id)
  }

  function shouldTransformCode(code: string): boolean {
    return HEAD_SSR_FILTER_RE.test(code)
  }

  return {
    name: 'unhead:ssr-static-replace',
    enforce: 'pre',
    transformInclude: shouldTransformId,

    transform: {
      filter: {
        code: HEAD_SSR_FILTER_RE,
        id: UNHEAD_JS_MODULE_RE,
      },
      handler(code, id) {
        if (!shouldTransformId(id))
          return

        if (!shouldTransformCode(code))
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
    },

    webpack(ctx) {
      if (ctx.name === 'server')
        ssr = true
    },
    vite: {
      apply(_config: UserConfig, env: ConfigEnv): boolean {
        // In dev mode (serve), both SSR and client environments share the same
        // vite dev server. Statically replacing head.ssr would force one value
        // for both environments, breaking SSR renders. Only apply during builds
        // where SSR and client are separate passes.
        if (env.command === 'serve') {
          enabled = false
          return true
        }
        if (env.isSsrBuild)
          ssr = true
        return true
      },
    },
  }
})
