import type { CompiledTags } from 'unhead/compiled/server'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions, VueHeadClient } from '../types'
import { FlatMetaPlugin } from 'unhead/plugins'
import { inject, toValue } from 'vue'
import { headSymbol } from '../install'

export type CompiledTagsHead = VueHeadClient<any> & { _acceptsCompiled?: unknown, blockLoad?: unknown }

export const COMPILED_TAGS_HEAD_ERROR = '[unhead] Use createHead from @unhead/vue/compiled/server or createLazyHead from @unhead/vue/lazy, or turn off compile.'

// v3 `injectHead`, which may return a head that cannot take compiled tags
export function injectCompiledTagsHead(options: UseHeadOptions): CompiledTagsHead | undefined {
  return (options.head || inject(headSymbol)) as CompiledTagsHead | undefined
}

export function resolveValues(values: readonly unknown[]): unknown[] {
  return values.map(value => toValue(value))
}

// The flat meta values that `useSeoMeta` renders the same way compiled tags do.
export function isText(value: unknown): boolean {
  return typeof value === 'string' ? !!value && value !== 'true' : Number.isFinite(value)
}

// The input of `useSeoMeta` compiled tags: the compiled tags, or the flat input v3 must decide
export function seoMetaInput(head: CompiledTagsHead, compiledTags: CompiledTags, loose: (values: unknown[]) => object, resolved: unknown[]): CompiledTags | object {
  if (resolved.every(isText))
    return compiledTags
  head.use(FlatMetaPlugin)
  return loose(resolved)
}

// On the server, a ref or getter value resolves once, on the first render, as v3 resolves it
export function serverCompiledHead(head: CompiledTagsHead, compiledTags: CompiledTags, values: readonly unknown[] | undefined, options: UseHeadOptions): ActiveHeadEntry<any> {
  return head.push(compiledTags as any, values ? { ...options, values: () => resolveValues(values) } as any : options)
}

export function serverCompiledSeoMeta(head: CompiledTagsHead, compiledTags: CompiledTags, loose: (values: unknown[]) => object, values: readonly unknown[], options: UseHeadOptions): ActiveHeadEntry<any> {
  const active: ActiveHeadEntry<any> = head.push(compiledTags as any, {
    ...options,
    values: () => {
      const resolved = resolveValues(values)
      const input = seoMetaInput(head, compiledTags, loose, resolved)
      if (input !== compiledTags)
        head.entries.get(active._i)!.input = input
      return resolved
    },
  } as any)
  return active
}
