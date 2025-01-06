import type { ActiveHeadEntry, HeadEntryOptions, HeadSafe, MergeHead, UseSeoMetaInput } from '@unhead/schema'
import type { UseHeadInput } from 'unhead'
import { unpackMeta, whitelistSafeInput } from '@unhead/shared'
import { useContext, useEffect, useRef } from 'react'
import { tryUseUnhead } from 'unhead'
import { UnheadContext } from './UnheadProvider'

export function injectHead() {
  // allow custom context setting
  const ctx = tryUseUnhead()
  if (ctx) {
    return ctx
  }
  // fallback to react context
  const instance = useContext(UnheadContext)
  if (!instance) {
    throw new Error('useHead() was called without provide context.')
  }
  return instance
}

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = options.head || injectHead()
  const entryRef = useRef<ActiveHeadEntry<UseHeadInput<T>>>()

  useEffect(() => {
    // @ts-expect-error untyped
    entryRef.current = head.push(input, options)

    return () => entryRef.current?.dispose()
  }, [head, input, options])

  return entryRef.current!
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
