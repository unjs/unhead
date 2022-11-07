import { asArray } from 'unhead'
import type { Arrayable, HeadEntryOptions } from 'unhead'
import type { Link, Meta, Noscript, ReactiveHead, Script, Style } from './types'
import { IS_CLIENT } from './env'
import { useHead as _serverUseHead, useServerHead as _serverUseServerHead } from './runtime/server'
import { useHead as _clientUseHead } from './runtime/client'

export function useServerHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  if (!IS_CLIENT)
    _serverUseServerHead(input, options)
}

export function useHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  if ((options.mode === 'server' && IS_CLIENT) || (options.mode === 'client' && !IS_CLIENT))
    return

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
