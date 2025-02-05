import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
  Unhead,
  UseSeoMetaInput,
} from '@unhead/schema'
import { unpackMeta, whitelistSafeInput } from '@unhead/shared'

export function useHead<T extends Unhead<any>>(unhead: T, input: Parameters<T['push']>[0], options: HeadEntryOptions = {}): ReturnType<T['push']> {
  return unhead.push(input, options) as ReturnType<T['push']>
}

export function useHeadSafe<T extends Unhead<any>>(unhead: T, input: HeadSafe, options?: HeadEntryOptions): ActiveHeadEntry<HeadSafe> {
  return useHead(unhead, input, {
    ...options,
    // @ts-expect-error untyped
    transform: whitelistSafeInput,
  })
}

export function useSeoMeta<T extends Unhead<any>>(unhead: T, input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> {
  const { title, titleTemplate, ...meta } = input
  return useHead(unhead, {
    title,
    titleTemplate,
    // we need to input the meta so the reactivity will be resolved
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
