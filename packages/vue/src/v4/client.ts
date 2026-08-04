import type { V4Plugin } from 'unhead/v4'
import type { DomBeforeRenderCtx, VueHeadClient } from './types'
import { createHead as _createHead } from 'unhead/v4/client'
import { nextTick } from 'vue'
import { vueInstall } from './install'

export interface CreateHeadOptions {
  document?: Document
  disableDefaults?: boolean
  /**
   * v3 compat: accepted and ignored. Capo weights are computed by the v4
   * compiler at compile time; there is no runtime sorting pass to disable.
   */
  disableCapoSorting?: boolean
  plugins?: V4Plugin[]
  /** injectable scheduler seam (v4 core): sync test flushes, view transitions */
  scheduler?: (flush: () => void) => void
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateHeadOptions = {}): VueHeadClient {
  const beforeRender: ((ctx: DomBeforeRenderCtx) => void)[] = []
  const shouldRender = () => {
    const ctx: DomBeforeRenderCtx = { shouldRender: true }
    for (const cb of beforeRender) cb(ctx)
    return ctx.shouldRender
  }
  // default rides vue's job queue (vue-native research SHIP verdict): head
  // flushes land after component effects in the same tick, zero extra bytes
  const schedule = options.scheduler || ((flush: () => void) => void nextTick(flush))
  const head = _createHead({
    document: options.document,
    disableDefaults: options.disableDefaults,
    // render gate: Nuxt pauses head DOM writes during hydration and page
    // transitions through the dom:beforeRender shim below. A blocked flush
    // leaves the head dirty; the next head.render() (Nuxt's syncHead) applies
    // the merged state in one paint.
    scheduler: flush => schedule(() => {
      shouldRender() && flush()
    }),
  }) as unknown as VueHeadClient
  for (const p of options.plugins || []) head.use(p)
  const render = head.render!
  head.render = () => shouldRender() && render()
  head.hooks = {
    hook(name, cb) {
      if (name === 'dom:beforeRender') {
        beforeRender.push(cb)
        return () => {
          const i = beforeRender.indexOf(cb)
          i >= 0 && beforeRender.splice(i, 1)
        }
      }
      // eslint-disable-next-line node/prefer-global/process -- bundler-defined NODE_ENV; minifiers strip the whole branch
      if (process.env.NODE_ENV !== 'production')
        console.warn(`[unhead] v4 has no hook bus; "${name}" is ignored. Only dom:beforeRender is shimmed (it gates DOM flushes).`)
      return () => {}
    },
  }
  head.install = vueInstall(head)
  return head
}
