import type { ActiveHeadEntry, HeadEntryOptions, HeadSafe, MergeHead } from 'unhead/types'
import type { UseHeadInput, UseSeoMetaInput } from './types'
import { useContext, useEffect } from 'react'
import { FlatMetaPlugin, SafeInputPlugin } from 'unhead/plugins'
import { UnheadContext } from './context'

export function useUnhead() {
  // fallback to react context
  const instance = useContext(UnheadContext)
  if (!instance) {
    throw new Error('useHead() was called without provide context.')
  }
  return instance
}

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = options.head || useUnhead()
  // @ts-expect-error untyped
  const entry = head.push(input, options)

  useEffect(() => {
    // @ts-expect-error untyped
    entry.patch(input)
  }, [input])

  useEffect(() => {
    return () => {
      entry?.dispose()
    }
  }, [])

  // @ts-expect-error untyped
  return entry
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
    _flatMeta: meta,
  }, options)
}
