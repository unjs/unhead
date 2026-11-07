import type { CompiledTags } from 'unhead/compiled/server'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions, VueHeadClient } from '../types'
import { FlatMetaPlugin } from 'unhead/plugins'
import { inject, toValue } from 'vue'
import { headSymbol } from '../install'

export type { CompiledTags }

type CompiledTagsHead = VueHeadClient<any> & { _acceptsCompiled?: 1 }

// v3 `injectHead`, with one error for a missing head and for a v3 head, which would
// push the compiled tags as loose input and render nothing for them
function compiledTagsHead(options: UseHeadOptions): CompiledTagsHead {
  const head = (options.head || inject(headSymbol)) as CompiledTagsHead | undefined
  if (!head?._acceptsCompiled)
    throw new Error('[unhead] For compiled head calls, use @unhead/vue/compiled/server, or turn off compile.')
  return head
}

function resolveValues(values: readonly unknown[]): unknown[] {
  return values.map(entryValue => toValue(entryValue))
}

// The flat meta values that `useSeoMeta` renders the same way compiled tags do.
function isText(value: unknown): boolean {
  return typeof value === 'string' ? !!value && value !== 'true' : Number.isFinite(value)
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useHead` call. The
 * call site evaluates each value. A ref or getter value resolves once, on the first
 * render, as v3 resolves it.
 *
 * @experimental
 */
export function useCompiledHead(compiledTags: CompiledTags, values?: readonly unknown[], options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = compiledTagsHead(options)
  return head.push(compiledTags as any, values ? { ...options, values: () => resolveValues(values) } as any : options)
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useSeoMeta` call.
 * When a value resolves to one that v3 renders by flat meta rules, such as an
 * empty string, the entry takes the input that `loose` rebuilds.
 *
 * @experimental
 */
export function useCompiledSeoMeta(compiledTags: CompiledTags, loose: (values: unknown[]) => object, values: readonly unknown[], options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = compiledTagsHead(options)
  const active: ActiveHeadEntry<any> = head.push(compiledTags as any, {
    ...options,
    values: () => {
      const resolved = resolveValues(values)
      if (!resolved.every(isText)) {
        head.use(FlatMetaPlugin)
        head.entries.get(active._i)!.input = loose(resolved)
      }
      return resolved
    },
  } as any)
  return active
}
