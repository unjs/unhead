import type { CompiledTags } from 'unhead/compiled'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions } from '../types'
import type { CompiledBranches, CompiledTagsHead, CompiledValues } from './tags'
import { COMPILED_TAGS_HEAD_ERROR, injectCompiledTagsHead, markSeoMeta, serverCompiledHead, serverCompiledSeoMeta } from './tags'

export type { CompiledTags }

// `@unhead/vue/compiled` under the `node` condition: a Node server bundle keeps the
// server half only, so it carries no client runtime.
function compiledTagsHead(options: UseHeadOptions): CompiledTagsHead {
  const head = injectCompiledTagsHead(options)
  if (!head?._acceptsCompiled)
    throw new Error(COMPILED_TAGS_HEAD_ERROR)
  return head
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useHead` call.
 *
 * @experimental
 */
export function useCompiledHead(compiledTags: CompiledTags | CompiledBranches, values?: CompiledValues, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return serverCompiledHead(compiledTagsHead(options), compiledTags, values, options)
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useSeoMeta` call.
 *
 * @experimental
 */
export function useCompiledSeoMeta(compiledTags: CompiledTags, loose: (values: unknown[]) => object, values: readonly unknown[], options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  return serverCompiledSeoMeta(compiledTagsHead(options), compiledTags, loose, values, options)
}

/**
 * Pushes compiled tags that the bundler `compile` option made from a `useSeoMeta` call with no values.
 *
 * @experimental
 */
export function useStaticCompiledSeoMeta(compiledTags: CompiledTags, options: UseHeadOptions = {}): ActiveHeadEntry<any> {
  const head = compiledTagsHead(options)
  return markSeoMeta(head, serverCompiledHead(head, compiledTags, undefined, options))
}
