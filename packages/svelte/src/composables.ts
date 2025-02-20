import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
  HeadSafe,
  Unhead,
  UseHeadInput,
  UseScriptInput,
  UseScriptOptions,
  UseScriptReturn,
  UseSeoMetaInput,
} from 'unhead/types'
import { getContext, onDestroy } from 'svelte'
import { useHead as baseHead, useHeadSafe as baseHeadSafe, useSeoMeta as baseSeoMeta, useScript as baseUseScript } from 'unhead'
import { UnheadContextKey } from './context'

export function useUnhead(): Unhead<Head> {
  const instance = getContext<Unhead<Head>>(UnheadContextKey)
  if (!instance) {
    throw new Error('useUnhead() was called without provide context.')
  }
  return instance
}

function withSideEffects<T extends ActiveHeadEntry<any>>(instance: T): T {
  onDestroy(() => {
    instance.dispose()
  })
  return instance
}

export function useHead(input: UseHeadInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput> {
  // @ts-expect-error untyped
  return withSideEffects(baseHead(options.head || useUnhead(), input, options))
}

export function useHeadSafe(input: HeadSafe = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<HeadSafe> {
  return withSideEffects(baseHeadSafe(options.head || useUnhead(), input, options))
}

export function useSeoMeta(input: UseSeoMetaInput = {}, options: HeadEntryOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
  return withSideEffects(baseSeoMeta(options.head || useUnhead(), input, options))
}

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(input: UseScriptInput, options: UseScriptOptions<T> = {}): UseScriptReturn<T> {
  // script self-manages side effects
  return baseUseScript(options.head || useUnhead(), input, options)
}
