import type { HeadEntryOptions } from '@unhead/schema'
import { asArray } from '../utils'
import type { Arrayable, Link, Meta, Noscript, ReactiveHead, Script, Style, UseHeadInput } from '../types'
import { IsClient } from '../env'
import { useHead as _serverUseHead, useServerHead as _serverUseServerHead } from './server'
import { useHead as _clientUseHead } from './client'

export function useServerHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  if (!IsClient)
    _serverUseServerHead(input, options)
}

export function useHead(input: UseHeadInput, options: HeadEntryOptions = {}) {
  if ((options.mode === 'server' && IsClient) || (options.mode === 'client' && !IsClient))
    return

  return IsClient ? _clientUseHead(input, options) : _serverUseHead(input, options)
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
