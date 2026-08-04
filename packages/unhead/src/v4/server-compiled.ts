/** Strict v4 server profile: sealed plans in, serialized payload out. */
import type { CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'
import type { V4Head } from './core'
import type { SSRPayload } from './server'
import { createSealedCore } from './core-sealed'
import { DEFAULT_PLAN, renderSSRHead as renderHead } from './server'

export type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from './compiled'
export type { SSRPayload } from './server'

export interface CreateCompiledServerHeadOptions {
  disableDefaults?: boolean
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateCompiledServerHeadOptions = {}): CompiledHead {
  const head = createSealedCore({ ssr: true })
  // Compiled tuples have no prop objects; the sealed core's use() throws
  if ('plugins' in options)
    head.use(0 as never)
  if (!options.disableDefaults)
    head.push(DEFAULT_PLAN)
  return head as unknown as CompiledHead
}

export function useHead(head: CompiledHead, plan: CompiledPlan, options?: CompiledEntryOptions) {
  return head.push(plan, options)
}

export function renderSSRHead(head: CompiledHead): SSRPayload {
  return renderHead(head as unknown as V4Head)
}
