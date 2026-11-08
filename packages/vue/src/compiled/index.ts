import type { CompiledTags } from 'unhead/compiled/server'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions, VueHeadClient } from '../types'
import { FlatMetaPlugin } from 'unhead/plugins'
import { toValue } from 'vue'
import { injectHead } from '../install'

export type { CompiledTags }

type CompiledTagsHead = VueHeadClient<any> & { _acceptsCompiled?: 1 }

// v3 `injectHead`, with its error outside `setup()`. A full runtime head would push the compiled tags
// as loose input and render nothing for them.
function compiledTagsHead(options: UseHeadOptions): CompiledTagsHead {
  const head = (options.head || injectHead()) as CompiledTagsHead
  if (!head._acceptsCompiled)
    throw new Error('[unhead] For compiled head calls, use @unhead/vue/compiled/server, or turn off compile.')
  return head
}

/** The values of a call, or a getter that returns them, as the build makes of a getter input. */
export type CompiledValues = readonly unknown[] | (() => readonly unknown[])

// A getter input runs once for all its values
function resolveValues(values: CompiledValues): unknown[] {
  return (typeof values === 'function' ? values() : values).map(entryValue => toValue(entryValue))
}

// The flat meta values that `useSeoMeta` renders the same way compiled tags do.
function isText(value: unknown): boolean {
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

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useHead` call. The
 * call site evaluates each value. A ref or getter value resolves once, on the first
 * render, as v3 resolves it.
 *
 * @experimental
 */
export function useCompiledHead(compiledTags: CompiledTags, values?: CompiledValues, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
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
      if (!resolved.every((value, index) => value === undefined
        ? isMarked(compiledTags, index, FLAG_UNDEFINED_DROPS)
        : isText(value) && (typeof value === 'string' || !isMarked(compiledTags, index, FLAG_STRING_VALUES)))) {
        head.use(FlatMetaPlugin)
        head.entries.get(active._i)!.input = loose(resolved)
      }
      return resolved
    },
  } as any)
  return active
}
