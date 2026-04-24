import type { Plugin } from 'vite'
import type { UnheadVueOptions } from './bundler'
import { Unhead as UnheadBundler } from './bundler'

export type UnheadVueViteOptions = UnheadVueOptions

/**
 * Vite plugin for `@unhead/vue`. Kept for backwards compatibility; prefer
 * the unified `@unhead/vue/bundler` entry which dispatches to all bundlers.
 *
 * @example
 * ```ts
 * import { Unhead } from '@unhead/vue/vite'
 * export default defineConfig({ plugins: [...Unhead({ streaming: true })] })
 * ```
 */
export function Unhead(options: UnheadVueOptions = {}): Plugin[] {
  return UnheadBundler(options).vite()
}
