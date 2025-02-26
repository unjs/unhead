import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
  Unhead,
  UseSeoMetaInput,
} from './types'
import { FlatMetaPlugin } from './plugins/flatMeta'
import { SafeInputPlugin } from './plugins/safe'

export function useHead<T extends Unhead<any>>(unhead: T, input: Parameters<T['push']>[0] = {}, options: HeadEntryOptions = {}): ReturnType<T['push']> {
  return unhead.push(input, options) as ReturnType<T['push']>
}

export function useHeadSafe<T extends Unhead<any>>(unhead: T, input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  unhead.use(SafeInputPlugin)
  return useHead(unhead, input, Object.assign(options, { _safe: true }))
}

export function useSeoMeta<T extends Unhead<any>>(unhead: T, input: UseSeoMetaInput = {}, options?: HeadEntryOptions): ActiveHeadEntry<UseSeoMetaInput> {
  unhead.use(FlatMetaPlugin)
  function normalize(input: UseSeoMetaInput) {
    // @ts-expect-error untyped
    if (input._flatMeta) {
      return input
    }
    const { title, titleTemplate, ...meta } = input || {}
    return {
      title,
      titleTemplate,
      _flatMeta: meta,
    }
  }
  const entry = unhead.push(normalize(input), options)
  // just in case
  const corePatch = entry.patch
  // @ts-expect-error runtime
  if (!entry.__patched) {
    entry.patch = input => corePatch(normalize(input))
    // @ts-expect-error runtime
    entry.__patched = true
  }
  return entry
}

/**
 * @deprecated use `useHead` instead. Advanced use cases should tree shake using import.meta.* if statements.
 */
export function useServerHead<T extends Unhead<any>>(unhead: T, input: Parameters<T['push']>[0] = {}, options: Omit<HeadEntryOptions, 'mode'> = {}): ReturnType<T['push']> {
  (options as HeadEntryOptions).mode = 'server'
  return unhead.push(input, options) as ReturnType<T['push']>
}

/**
 * @deprecated use `useHeadSafe` instead. Advanced use cases should tree shake using import.meta.* if statements.
 */
export function useServerHeadSafe<T extends Unhead<any>>(unhead: T, input: HeadSafe = {}, options: Omit<HeadEntryOptions, 'mode'> = {}): ActiveHeadEntry<HeadSafe> {
  (options as HeadEntryOptions).mode = 'server'
  return useHeadSafe(unhead, input, { ...options, mode: 'server' })
}

/**
 * @deprecated use `useSeoMeta` instead. Advanced use cases should tree shake using import.meta.* if statements.
 */
export function useServerSeoMeta<T extends Unhead<any>>(unhead: T, input: UseSeoMetaInput = {}, options?: Omit<HeadEntryOptions, 'mode'>): ActiveHeadEntry<UseSeoMetaInput> {
  (options as HeadEntryOptions).mode = 'server'
  return useSeoMeta(unhead, input, { ...options, mode: 'server' })
}

export { useScript } from './scripts'
