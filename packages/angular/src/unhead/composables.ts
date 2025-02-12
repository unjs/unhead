import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from 'unhead/types'
import type { AngularUnhead, UseHeadInput, UseHeadOptions, UseHeadSafeInput, UseSeoMetaInput } from './types/index'
import { DestroyRef, effect, inject, signal } from '@angular/core'
import { unpackMeta, whitelistSafeInput } from 'unhead/utils'
import { UnheadInjectionToken } from './install'
import { resolveSignalHeadInput } from './utils'

export function injectHead() {
  const instance = inject<AngularUnhead>(UnheadInjectionToken)
  if (!instance) {
    throw new Error('useHead() was called without proper injection context.')
  }
  return instance
}

export function useHead<T extends MergeHead>(
  input: UseHeadInput<T>,
  options: UseHeadOptions = {},
): ActiveHeadEntry<UseHeadInput<T>> {
  const head = options.head || injectHead()
  return head.ssr ? head.push(input, options as HeadEntryOptions) : clientUseHead(head, input, options as HeadEntryOptions)
}

function clientUseHead<T extends MergeHead>(
  head: AngularUnhead,
  input: UseHeadInput<T>,
  options: HeadEntryOptions = {},
): ActiveHeadEntry<UseHeadInput<T>> {
  const deactivated = signal(false)
  const resolvedInput = signal({})

  effect(() => {
    resolvedInput.set(
      deactivated() ? {} : resolveSignalHeadInput(input),
    )
  })

  const entry: ActiveHeadEntry<UseHeadInput<T>> = head.push(resolvedInput(), options)

  effect(() => {
    entry.patch(resolvedInput())
  })

  const destroyRef = inject(DestroyRef)
  destroyRef.onDestroy(() => {
    entry.dispose()
  })

  return entry
}

export function useHeadSafe(
  input: UseHeadSafeInput,
  options: UseHeadOptions = {},
): ActiveHeadEntry<any> {
  // @ts-expect-error runtime type
  return useHead(input, {
    ...options,
    transform: whitelistSafeInput,
  })
}

export function useSeoMeta(
  input: UseSeoMetaInput,
  options?: UseHeadOptions,
): ActiveHeadEntry<any> {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    // @ts-expect-error runtime type
    _flatMeta: meta,
  }, {
    ...options,
    transform(t) {
      // @ts-expect-error runtime type
      const meta = unpackMeta({ ...t._flatMeta })
      // @ts-expect-error runtime type
      delete t._flatMeta
      // @ts-expect-error runtime type
      return { ...t, meta }
    },
  })
}
