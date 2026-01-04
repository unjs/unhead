import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
  ResolvableHead,
  Unhead,
  UseSeoMetaInput,
} from './types'
import { FlatMetaPlugin } from './plugins/flatMeta'
import { SafeInputPlugin } from './plugins/safe'

export function useHead<T extends Unhead<any>, I = ResolvableHead>(unhead: T, input?: ResolvableHead, options: HeadEntryOptions = {}): ActiveHeadEntry<I> {
  return unhead.push((input || {}) as I, options) as ActiveHeadEntry<I>
}

export function useHeadSafe<T extends Unhead<any>>(unhead: T, input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  unhead.use(SafeInputPlugin)
  return useHead(unhead, input as ResolvableHead, Object.assign(options, { _safe: true })) as ActiveHeadEntry<HeadSafe>
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

export { useScript } from './scripts'
