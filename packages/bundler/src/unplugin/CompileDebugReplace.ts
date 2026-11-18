import type { UnpluginOptions } from './types'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'

export function compileDebug(compile: UnpluginOptions['compile']): boolean {
  return typeof compile === 'object' && !!compile.debug
}

export interface CompileDebugReplaceOptions {
  debug?: boolean
}

const COMPILE_DEBUG_RE = /\b__UNHEAD_COMPILE_DEBUG__\b/g

/**
 * Replaces `__UNHEAD_COMPILE_DEBUG__` with `true` or `false` in every module, unhead
 * itself included. With `false`, the minifier drops the debug code that it guards.
 */
export const CompileDebugReplace = createUnplugin<CompileDebugReplaceOptions, false>((options = {}) => {
  const value = String(!!options.debug)
  return {
    name: 'unhead:compile-debug-replace',
    // after TypeScript is stripped, so a `declare const` of the name is gone
    enforce: 'post',
    transform: {
      filter: { code: /__UNHEAD_COMPILE_DEBUG__/ },
      handler(code) {
        const s = new MagicString(code)
        for (const match of code.matchAll(COMPILE_DEBUG_RE))
          s.overwrite(match.index, match.index + match[0].length, value)
        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true }),
        }
      },
    },
  }
})
