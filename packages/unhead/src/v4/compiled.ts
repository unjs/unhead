import type { Entry, PlanFill, PlanTag, Tag } from './core'

/** Build-emitted plan accepted by the strict compiled runtime profiles. */
export type CompiledPlan = PlanTag[] & { readonly __unhead_v4_compiled_plan: true }

export interface CompiledEntryOptions {
  /** String values consumed by the plan's holes from left to right. */
  fills?: readonly PlanFill[]
}

export interface CompiledEntry {
  patch: (plan: CompiledPlan, fills?: readonly PlanFill[]) => void
  dispose: () => void
}

/**
 * Public strict head surface. Loose objects and runtime plugins are absent by
 * design because both require the L1 compiler or prop-bearing runtime tags.
 */
export interface CompiledHead {
  readonly entries: Map<number, Entry>
  readonly ssr: boolean
  push: (plan: CompiledPlan, options?: CompiledEntryOptions) => CompiledEntry
  resolve: () => Tag[]
  invalidate: () => void
}
