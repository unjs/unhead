import type { CompiledTags } from 'unhead/compiled'
import type { LazyHeadEntry, LazyUnhead } from 'unhead/lazy'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions } from '../types'
import type { CompiledTagsHead, CompiledValues } from './tags'
import { acceptCompiledTags } from 'unhead/lazy'
import { getCurrentInstance, getCurrentScope, onActivated, onBeforeUnmount, onDeactivated, onScopeDispose, watchEffect } from 'vue'
import { COMPILED_TAGS_HEAD_ERROR, injectCompiledTagsHead, resolveValues, seoMetaInput, serverCompiledHead, serverCompiledSeoMeta } from './tags'

export type { CompiledTags }

// A full runtime head would push the compiled tags as loose input and render nothing for them. A lazy
// client head takes compiled tags once `acceptCompiledTags` ran, so the first call enables it.
function compiledTagsHead(options: UseHeadOptions): CompiledTagsHead {
  const head = injectCompiledTagsHead(options)
  if (!head?._acceptsCompiled) {
    if (!head?.blockLoad)
      throw new Error(COMPILED_TAGS_HEAD_ERROR)
    acceptCompiledTags(head as unknown as LazyUnhead<any>)
  }
  return head
}

// `clientUseHead` for compiled tags: one effect reads the values and patches the entry, and
// with no values there is no effect.
function clientPush(head: CompiledTagsHead, input: (resolved: unknown[]) => CompiledTags | object, values: CompiledValues | undefined, options: UseHeadOptions): LazyHeadEntry<any> {
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
    const next = active ? input(resolved!) : []
    if (entry)
      entry.patch(next, { values: resolved })
    else
      entry = (head as unknown as LazyUnhead<any>).push(next, { ...options, values: resolved } as any)
  }
  values ? watchEffect(apply) : apply()

  if (getCurrentInstance()) {
    onBeforeUnmount(() => entry.dispose())
    onDeactivated(() => {
      active = false
      apply()
    })
    onActivated(() => {
      active = true
      apply()
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
export function useCompiledHead(compiledTags: CompiledTags, values?: CompiledValues, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = compiledTagsHead(options)
  return head.ssr
    ? serverCompiledHead(head, compiledTags, values, options)
    : clientPush(head, () => compiledTags, values, options)
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
    : clientPush(head, resolved => seoMetaInput(head, compiledTags, loose, resolved), values, options)
}
