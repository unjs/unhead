import type { CompiledTags } from 'unhead/compiled'
import type { LazyHeadEntry, LazyUnhead } from 'unhead/lazy'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions } from '../types'
import type { CompiledBranches, CompiledTagsHead, CompiledValues } from './tags'
import { getCurrentInstance, getCurrentScope, onActivated, onBeforeUnmount, onDeactivated, onScopeDispose, watchEffect } from 'vue'
import { COMPILED_TAGS_HEAD_ERROR, injectCompiledTagsHead, markSeoMeta, resolveValues, selectBranch, seoMetaInput, serverCompiledHead, serverCompiledSeoMeta } from './tags'

export type { CompiledTags }

// A full runtime head would push the compiled tags as loose input and render nothing for them
function compiledTagsHead(options: UseHeadOptions): CompiledTagsHead {
  const head = injectCompiledTagsHead(options)
  if (!head?._acceptsCompiled)
    throw new Error(COMPILED_TAGS_HEAD_ERROR)
  return head
}

// `clientUseHead` for compiled tags: one effect reads the values and patches the entry, and
// with no values there is no effect.
function clientPush(head: CompiledTagsHead, input: (resolved: unknown[]) => [CompiledTags | object, unknown[]], values: CompiledValues | undefined, options: UseHeadOptions): LazyHeadEntry<any> {
  const scope = getCurrentScope()
  // a stopped scope cannot run an effect, so the component is gone
  if (scope && !scope.active)
    return { patch() {}, dispose() {}, _i: -1 }
  if (options.onRendered && scope) {
    const onRendered = options.onRendered
    options = { ...options, onRendered: ctx => scope.run(() => onRendered(ctx)) }
  }

  let active = true
  let entry: LazyHeadEntry<any>
  const apply = () => {
    const resolved = values && resolveValues(values)
    const [next, nextValues] = active ? input(resolved!) : [[], resolved]
    if (entry)
      entry.patch(next, { values: nextValues })
    else
      entry = (head as unknown as LazyUnhead<any>).push(next, { ...options, values: nextValues } as any)
  }
  values ? watchEffect(apply) : apply()

  if (getCurrentInstance()) {
    onBeforeUnmount(() => entry.dispose())
    onDeactivated(() => {
      active = false
      apply()
    })
    // Vue also runs this on the first mount, so only a deactivated entry applies, as loose
    // `useHead` changes nothing then. A patch during hydration would load the runtime.
    onActivated(() => {
      if (!active) {
        active = true
        apply()
      }
    })
  }
  else if (scope) {
    onScopeDispose(() => entry.dispose())
  }
  return entry!
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useHead` call. The
 * call site evaluates each value. On the server a ref or getter value resolves once, on
 * the first render, as v3 resolves it. On a lazy client head one effect tracks the
 * values, and a call with no values creates no effect.
 *
 * @internal
 */
export function useCompiledHead(compiledTags: CompiledTags | CompiledBranches, values?: CompiledValues, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = compiledTagsHead(options)
  return head.ssr
    ? serverCompiledHead(head, compiledTags, values, options)
    : clientPush(head, resolved => selectBranch(compiledTags, resolved), values, options)
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useSeoMeta` call.
 * When a value resolves to one that v3 renders by flat meta rules, such as an
 * empty string, the entry takes the input that `loose` rebuilds.
 *
 * @internal
 */
export function useCompiledSeoMeta(compiledTags: CompiledTags, loose: (values: unknown[]) => object, values: readonly unknown[], options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = compiledTagsHead(options)
  return head.ssr
    ? serverCompiledSeoMeta(head, compiledTags, loose, values, options)
    : markSeoMeta(head, clientPush(head, resolved => [seoMetaInput(head, compiledTags, loose, resolved), resolved], values, options))
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useSeoMeta` call with
 * no values. No value can need the flat meta rules of v3, so it carries no fallback.
 *
 * @internal
 */
export function useStaticCompiledSeoMeta(compiledTags: CompiledTags, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return markSeoMeta(compiledTagsHead(options), useCompiledHead(compiledTags, undefined, options))
}
