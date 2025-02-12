import type { ActiveHeadEntry, HeadEntryOptions, HeadSafe, MergeHead } from 'unhead/types'
import type { UseHeadInput, UseSeoMetaInput } from './types'
import { unpackMeta, whitelistSafeInput } from '@unhead/shared'
import { useContext, useEffect } from 'react'
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
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}

export function useSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    // we need to input the meta so the reactivity will be resolved
    // @ts-expect-error runtime type
    _flatMeta: meta,
  }, {
    ...options,
    transform(t) {
      // @ts-expect-error runtime type
      const meta = unpackMeta({ ...t._flatMeta })
      // @ts-expect-error runtime type
      delete t._flatMeta
      return {
        // @ts-expect-error runtime type
        ...t,
        meta,
      }
    },
  })
}
