import type { CompiledClientHead, CreateCompiledClientHeadOptions } from 'unhead/v4/client-compiled'
import type { App } from 'vue'
import type { DomBeforeRenderCtx, HooksShim, VueHeadClient } from './types'
import { createHead as createCompiledHead } from 'unhead/v4/client-compiled'
import { nextTick } from 'vue'
import { vueInstall } from './install'

export type { CompiledEntry, CompiledEntryOptions, CompiledPlan } from 'unhead/v4/client-compiled'

export interface VueCompiledClientHead extends CompiledClientHead {
  hooks: HooksShim
  install: (app: App) => void
}

export type CreateHeadOptions = CreateCompiledClientHeadOptions

const vueScheduler = (flush: () => void) => void nextTick(flush)

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateHeadOptions = {}): VueCompiledClientHead {
  const beforeRender: ((ctx: DomBeforeRenderCtx) => void)[] = []
  const shouldRender = () => {
    if (!beforeRender.length)
      return true
    const ctx: DomBeforeRenderCtx = { shouldRender: true }
    for (const cb of beforeRender) cb(ctx)
    return ctx.shouldRender
  }
  const schedule = options.scheduler || vueScheduler
  const head = createCompiledHead({
    ...options,
    scheduler: flush => schedule(() => shouldRender() && flush()),
  }) as VueCompiledClientHead
  const render = head.render
  head.render = () => shouldRender() && render()
  head.hooks = {
    hook(name, cb) {
      if (name !== 'dom:beforeRender')
        return () => {}
      beforeRender.push(cb)
      return () => {
        const index = beforeRender.indexOf(cb)
        index >= 0 && beforeRender.splice(index, 1)
      }
    },
  }
  head.install = vueInstall(head as unknown as VueHeadClient)
  return head
}

export function renderDOMHead(head: VueCompiledClientHead): boolean {
  return head.render()
}
