import { asArray } from 'unhead'
import type { Arrayable, HeadEntryOptions } from 'unhead'
import type { Link, Meta, Noscript, ReactiveHead, Script, Style } from './types'
import { IS_CLIENT } from './env'
import { useHead as _serverUseHead, useServerHead as _serverUseServerHead } from './runtime/server'
import { useHead as _clientUseHead, useServerHead as _clientUseServerHead } from './runtime/client'

export function useServerHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  return IS_CLIENT ? _clientUseServerHead(input, options) : _serverUseServerHead(input, options)
}

export function useHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  return IS_CLIENT ? _clientUseHead(input, options) : _serverUseHead(input, options)
}

export const useTitle = (title: ReactiveHead['title']) => useHead({ title })

export const useTitleTemplate = (titleTemplate: ReactiveHead['titleTemplate']) => useHead({ titleTemplate })

export const useMeta = (meta: Arrayable<Meta>) => useHead({ meta: asArray(meta) })

export const useLink = (link: Arrayable<Link>) => useHead({ link: asArray(link) })

export const useScript = (script: Arrayable<Script>) => useHead({ script: asArray(script) })

export const useStyle = (style: Arrayable<Style>) => useHead({ style: asArray(style) })

export const useNoscript = (noscript: Arrayable<Noscript>) => useHead({ noscript: asArray(noscript) })

export const useBase = (base: ReactiveHead['base']) => useHead({ base })

export const useHtmlAttrs = (attrs: ReactiveHead['htmlAttrs']) => useHead({ htmlAttrs: attrs })

export const useBodyAttrs = (attrs: ReactiveHead['bodyAttrs']) => useHead({ bodyAttrs: attrs })
//
// export const useMetaFlat = (meta: MetaFlat) => {
//   const val = ref()
//   watch(() => input, () => {
//     val.value = unpackMetaCore(deepUnref(input))
//   }, {
//     immediate: true,
//     deep: true,
//   })
//   return val
// }

// export function packMeta<T extends ReactiveHead['meta']>(input: T): Ref<MetaFlat> {
//   const val = ref()
//   watchEffect(() => {
//     val.value = packMetaCore(deepUnref(input))
//   })
//   return val
// }
//
// export function unpackMeta<T extends MaybeComputedRef<MetaFlatRef>>(input: T): Ref<Required<Head>['meta']> {
//   const val = ref()
//   watch(() => input, () => {
//     val.value = unpackMetaCore(deepUnref(input))
//   }, {
//     immediate: true,
//     deep: true,
//   })
//   return val
// }
