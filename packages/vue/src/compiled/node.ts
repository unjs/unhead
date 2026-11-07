import type { CompiledTags } from 'unhead/compiled/server'
import type { ActiveHeadEntry } from 'unhead/types'
import type { UseHeadOptions } from '../types'
import type { CompiledTagsHead } from './tags'
import { COMPILED_TAGS_HEAD_ERROR, injectCompiledTagsHead, serverCompiledHead, serverCompiledSeoMeta } from './tags'

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
export function useCompiledHead(compiledTags: CompiledTags, values?: readonly unknown[], options: UseHeadOptions = {}): ActiveHeadEntry<any> {
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
