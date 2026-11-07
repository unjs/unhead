import type { CompiledTags } from 'unhead/compiled/server'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions, VueHeadClient } from '../types'
import { FlatMetaPlugin } from 'unhead/plugins'
import { toValue, unref } from 'vue'
import { injectHead } from '../install'

export type CompiledTagsHead = VueHeadClient<any> & { _acceptsCompiled?: unknown, blockLoad?: unknown }

export const COMPILED_TAGS_HEAD_ERROR = '[unhead] This head cannot take compiled tags. Create it with createHead() from @unhead/vue/compiled/server or createLazyHead() from @unhead/vue/lazy. Or set compile: false in the Unhead plugin.'

// v3 `injectHead`, with its error outside `setup()`. It may return a head that cannot take compiled tags.
export function injectCompiledTagsHead(options: UseHeadOptions): CompiledTagsHead | undefined {
  return (options.head || injectHead()) as CompiledTagsHead | undefined
}

/** The values of a call, or a getter that returns them, as the build makes of a getter input. */
export type CompiledValues = readonly unknown[] | (() => readonly unknown[])

// v3 unwraps a ref that a getter returns. A getter input runs once for all its values.
export function resolveValues(values: CompiledValues): unknown[] {
  return (typeof values === 'function' ? values() : values).map(value => unref(toValue(value)))
}

// The flat meta values that `useSeoMeta` renders the same way compiled tags do.
export function isText(value: unknown): boolean {
  return typeof value === 'string' ? !!value && value !== 'true' : Number.isFinite(value)
}

// The `FLAG_UNDEFINED_DROPS` and `FLAG_STRING_VALUES` flags of `unhead/compiled`. The build marks
// every tag of a flat meta value whose `undefined` makes no tag in v3, and of one whose number v3
// renders by other rules.
const FLAG_UNDEFINED_DROPS = 8
const FLAG_STRING_VALUES = 16

function isMarked(compiledTags: CompiledTags, index: number, flag: number): boolean {
  return compiledTags.some(tag => tag[5]! & flag && JSON.stringify(tag).includes(`\uE000${index}\uE001`))
}

// The input of `useSeoMeta` compiled tags: the compiled tags, or the flat input v3 must decide
export function seoMetaInput(head: CompiledTagsHead, compiledTags: CompiledTags, loose: (values: unknown[]) => object, resolved: unknown[]): CompiledTags | object {
  if (resolved.every((value, index) => value === undefined
    ? isMarked(compiledTags, index, FLAG_UNDEFINED_DROPS)
    : isText(value) && (typeof value === 'string' || !isMarked(compiledTags, index, FLAG_STRING_VALUES))))
    return compiledTags
  head.use(FlatMetaPlugin)
  return loose(resolved)
}

// On the server, a ref or getter value resolves once, on the first render, as v3 resolves it
export function serverCompiledHead(head: CompiledTagsHead, compiledTags: CompiledTags, values: CompiledValues | undefined, options: UseHeadOptions): ActiveHeadEntry<any> {
  return head.push(compiledTags as any, values ? { ...options, values: () => resolveValues(values) } as any : options)
}

export function serverCompiledSeoMeta(head: CompiledTagsHead, compiledTags: CompiledTags, loose: (values: unknown[]) => object, values: CompiledValues, options: UseHeadOptions): ActiveHeadEntry<any> {
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
