import type { EntryOptions, V4Head } from 'unhead/v4'
import type { App } from 'vue'
import type { UseHeadInput, UseHeadSafeInput, UseSeoMetaInput } from '../types'

export type { UseHeadInput, UseHeadSafeInput, UseSeoMetaInput }
export type { SerializableHead } from 'unhead/types'

export interface DomBeforeRenderCtx {
  shouldRender: boolean
}

/**
 * Minimal v3-compatible hook registry. v4 has no hook bus; only
 * `dom:beforeRender` is functional (it gates DOM flushes, which is what Nuxt
 * uses to pause head updates during hydration and page transitions). Any other
 * hook name is accepted and ignored, with a dev warning.
 */
export interface HooksShim {
  hook: (name: string, cb: (ctx: DomBeforeRenderCtx) => void) => () => void
}

export interface ActiveHeadEntry<I = UseHeadInput> {
  patch: (input: I) => void
  dispose: () => void
  /** v3 compat: inert marker for entries returned from a dead scope */
  _i?: number
}

export interface VueHeadClient extends V4Head {
  install: (app: App) => void
  /** client heads only: v3 `dom:beforeRender` compat shim */
  hooks?: HooksShim
  /** client heads only: sync flush, returns whether a render happened */
  render?: () => boolean
}

export interface UseHeadOptions extends Pick<EntryOptions, 'tagPriority' | 'tagPosition'> {
  head?: VueHeadClient
}
