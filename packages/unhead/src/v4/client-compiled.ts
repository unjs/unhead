/** Strict v4 browser profile: sealed plans in, DOM effects out. */
import type { CreateClientHeadOptions } from './client'
import type { CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'
import { attachDom } from './client'
import { installPlanRenderer } from './client-plans'
import { createCore } from './core'

export type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'

export interface CompiledClientHead extends CompiledHead {
  readonly dirty: boolean
  render: () => boolean
}

export type CreateCompiledClientHeadOptions = CreateClientHeadOptions

function rejectPlugin() {
  throw new Error('[unhead] compiled heads cannot install runtime plugins')
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateCompiledClientHeadOptions = {}): CompiledClientHead {
  if ('plugins' in options)
    rejectPlugin()
  const head = attachDom(createCore({ ssr: false }), options)
  installPlanRenderer(head)
  // A plan has no props for resolve slots to inspect. Keep the object's fast
  // shape while making an untyped runtime plugin install fail loudly.
  head.use = rejectPlugin
  return head as unknown as CompiledClientHead
}

export function useHead(head: CompiledClientHead, plan: CompiledPlan, options?: CompiledEntryOptions) {
  return head.push(plan, options)
}

export function renderDOMHead(head: CompiledClientHead): boolean {
  return head.render()
}
