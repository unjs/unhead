/** Vue lifecycle adapter for strict compiled plans. */
import type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from 'unhead/v4/client-compiled'
import { getCurrentInstance, getCurrentScope, onBeforeUnmount, watch } from 'vue'
import { injectHead as injectVueHead } from './install'

export type { CompiledEntry, CompiledEntryOptions, CompiledHead, CompiledPlan } from 'unhead/v4/client-compiled'

export interface UseHeadOptions extends Omit<CompiledEntryOptions, 'fills'> {
  head?: CompiledHead
  /**
   * One string per plan hole, or a getter returning one raw value per hole
   * (what `V4PlanTransform` emits for a reactive hole: `() => [x.value]`,
   * left at the original call site so it keeps closing over component
   * scope). A getter is watched: each change refills the sealed plan in
   * place through the same escape contract a static fill uses
   * (V4_DESIGN.md 15's fill contract), never a recompile. SSR evaluates the
   * getter once; there is no server watcher.
   */
  fills?: readonly string[] | (() => readonly unknown[])
}

/* @__NO_SIDE_EFFECTS__ */
export function injectHead(): CompiledHead {
  return injectVueHead() as unknown as CompiledHead
}

/**
 * Fill-binding coercion. A hole can only ever change a value already proven
 * safe at build time (string/number); it can never make a tag/attribute
 * appear or disappear, so null/undefined/boolean/object are a structural
 * violation, not a value to normalize away. Dev throws with the hole index
 * so the failure names what broke; production only does the one coercion
 * the sealed fill contract itself performs (numbers stringify to interpolate
 * into the compiled fragment) and otherwise passes the value through
 * unchanged, so a violation still fails loudly inside the fill contract's own
 * escape code (`.replace` on a non-string) instead of being masked here.
 */
function coerceFill(v: unknown, i: number): string {
  if (typeof v === 'string')
    return v
  if (typeof v === 'number')
    return String(v)
  // eslint-disable-next-line node/prefer-global/process -- bundler-defined NODE_ENV; minifiers strip this branch in production
  if (process.env.NODE_ENV !== 'production') {
    throw new TypeError(`[unhead] sealed hole #${i} resolved to ${v === null ? 'null' : v === undefined ? 'undefined' : typeof v}; a hole can only change a string, never add, remove, or restructure a tag/attribute`)
  }
  return v as string
}

/**
 * Push one build-emitted plan and bind its disposal to the current component.
 * Reactive loose values are intentionally absent; dynamic data is passed as
 * precompiled string fills, either static or a watched getter (reactive
 * holes: the plan's structure was fixed at build time, only its strings move).
 */
export function useHead(plan: CompiledPlan, options: UseHeadOptions = {}): CompiledEntry {
  const scope = getCurrentScope()
  if (scope && !scope.active)
    return { patch() {}, dispose() {} }

  const head = options.head || injectHead()
  const fillsOpt = options.fills

  if (typeof fillsOpt !== 'function') {
    const entry = head.push(plan, fillsOpt ? { fills: fillsOpt } : undefined)
    if (getCurrentInstance())
      onBeforeUnmount(entry.dispose)
    return entry
  }

  const evaluate = () => (fillsOpt() as unknown[]).map(coerceFill)
  const entry = head.push(plan, { fills: evaluate() })

  // SSR renders once: no watcher to create or tear down.
  if (head.ssr) {
    if (getCurrentInstance())
      onBeforeUnmount(entry.dispose)
    return entry
  }

  const stop = watch(evaluate, fills => entry.patch(plan, fills))
  const dispose = () => {
    stop()
    entry.dispose()
  }
  if (getCurrentInstance())
    onBeforeUnmount(dispose)
  return { patch: entry.patch, dispose }
}

/**
 * `useSeoMeta` has no compiled-plan identity of its own: `UseSeoMetaTransform`
 * rewrites a static call to plain `useHead` source before `V4PlanTransform`
 * ever runs, so by the time either bundler transform is done, this name and
 * `useHead` are interchangeable. It exists only so source keeps its authored
 * intent and so the SEO transform's rewritten import resolves against a
 * trusted compiled composable instead of falling back to loose `@unhead/vue`.
 */
export const useSeoMeta = useHead
