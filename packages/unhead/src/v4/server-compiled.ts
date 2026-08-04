/** Strict v4 server profile: sealed plans in, serialized payload out. */
import type { CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'
import type { V4Head } from './core'
import type { SSRPayload } from './server'
import { createCore } from './core'
import { DEFAULT_PLAN, renderSSRHead as renderHead } from './server'

export type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'
export type { SSRPayload } from './server'

export interface CreateCompiledServerHeadOptions {
  disableDefaults?: boolean
}

function rejectPlugin() {
  throw new Error('[unhead] compiled heads cannot install runtime plugins')
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateCompiledServerHeadOptions = {}): CompiledHead {
  if ('plugins' in options)
    rejectPlugin()
  const head = createCore({ ssr: true })
  if (!options.disableDefaults)
    head.push(DEFAULT_PLAN)
  // Compiled tuples have no prop objects. Resolve plugins cannot safely run.
  head.use = rejectPlugin
  return head as unknown as CompiledHead
}

export function useHead(head: CompiledHead, plan: CompiledPlan, options?: CompiledEntryOptions) {
  return head.push(plan, options)
}

export function renderSSRHead(head: CompiledHead): SSRPayload {
  return renderHead(head as unknown as V4Head)
}
