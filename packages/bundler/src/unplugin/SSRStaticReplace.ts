import type { ConfigEnv, UserConfig } from 'vite'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'
import { resolveBuildConsumer } from './utils'

const UNHEAD_JS_MODULE_RE = /[\\/]node_modules[\\/](?:@unhead[\\/][^\\/]+|unhead)[\\/].*\.(?:c|m)?js$/
const HEAD_SSR_FILTER_RE = /\bhead\.ssr\b/
const HEAD_SSR_RE = new RegExp(HEAD_SSR_FILTER_RE.source, 'g')

export const SSRStaticReplace = createUnplugin<Record<string, never>, false>(() => {
  // Fallback build target for bundlers without a per-transform environment
  // (webpack, rspack, Vite <6). Those bundlers create a separate plugin
  // instance per build, so instance-local state is safe there. Under the Vite
  // Environment API (`this.environment`) the target is resolved per transform
  // call, since one plugin instance can serve both client and server
  // environments in one pipeline. When the target is unknown (plain rollup),
  // `head.ssr` is left dynamic in the source.
  let fallbackConsumer: BuildConsumer | undefined

  function shouldTransformId(id: string): boolean {
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
        const consumer = resolveBuildConsumer(this, fallbackConsumer)
        // Unknown build target: retain `head.ssr` so runtime detection keeps
        // working instead of hard-coding the wrong branch.
        if (!consumer)
          return

        if (!shouldTransformId(id))
          return

        if (!shouldTransformCode(code))
          return

        const ssr = consumer === 'server'
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
      fallbackConsumer = ctx.name === 'server' ? 'server' : 'client'
    },
    vite: {
      // Per-call target resolution via `this.environment` makes the plugin
      // safe to share across environments in a single build pipeline.
      sharedDuringBuild: true,
      apply(_config: UserConfig, env: ConfigEnv): boolean {
        // In dev mode (serve), both SSR and client environments share the same
        // vite dev server module graph. Statically replacing head.ssr would
        // force one value for both environments, breaking SSR renders. Only
        // apply during builds where SSR and client are separate outputs.
        if (env.command === 'serve')
          return false
        fallbackConsumer = env.isSsrBuild ? 'server' : 'client'
        return true
      },
    },
  }
})
