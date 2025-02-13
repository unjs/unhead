import type {
  ActiveHeadEntry,
  HeadEntryOptions,
  HeadSafe,
  Unhead,
  UseSeoMetaInput,
} from './types'
import { FlatMetaPlugin } from './plugins/flatMeta'
import { SafeInputPlugin } from './plugins/safe'

export function useHead<T extends Unhead<any>>(unhead: T, input: Parameters<T['push']>[0], options: HeadEntryOptions = {}): ReturnType<T['push']> {
  return unhead.push(input, options) as ReturnType<T['push']>
}

export function useHeadSafe<T extends Unhead<any>>(unhead: T, input: HeadSafe, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  unhead.use(SafeInputPlugin)
  return useHead(unhead, input, Object.assign(options, { _safe: true }))
}

export function useSeoMeta<T extends Unhead<any>>(unhead: T, input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> {
  const { title, titleTemplate, ...meta } = input
  unhead.use(FlatMetaPlugin)
  return useHead(unhead, {
    title,
    titleTemplate,
    // we need to input the meta so the reactivity will be resolved
    _flatMeta: meta,
  }, options)
}
