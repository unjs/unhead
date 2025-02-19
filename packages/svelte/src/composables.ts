import type { ActiveHeadEntry, HeadEntryOptions, HeadSafe, Unhead, UseHeadInput, UseSeoMetaInput } from './types'
import { getContext, onDestroy } from 'svelte'
import { UnheadContextKey } from './context'
import { FlatMetaPlugin, SafeInputPlugin } from './plugins'

export function useUnhead(): Unhead<any> {
  const instance = getContext<Unhead<any>>(UnheadContextKey)
  if (!instance) {
    throw new Error('useUnhead() was called without provide context.')
  }
  return instance
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  const head = options.head || useUnhead()
  // @ts-expect-error untyped
  const instance = head.push(input, options)
  onDestroy(() => {
    instance.dispose()
  })
  // @ts-expect-error untyped
  return instance
}

export function useHeadSafe(input: HeadSafe, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  const head = options.head || useUnhead()
  head.use(SafeInputPlugin)
  options._safe = true
  // @ts-expect-error untyped
  return useHead(input, options)
}

export function useSeoMeta(input: UseSeoMetaInput, options: HeadEntryOptions = {}): ActiveHeadEntry<any> {
  const head = options.head || useUnhead()
  head.use(FlatMetaPlugin)
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    // @ts-expect-error untyped
    _flatMeta: meta,
  }, options)
}
