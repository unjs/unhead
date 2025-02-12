import type { JSDOM } from 'jsdom'
import type { CreateHeadOptions } from '../src/types'
import { createHead as createClientHead } from 'unhead/client'
import { createHead as createServerHead } from 'unhead/server'
import { useDom } from './fixtures'

export function createClientHeadWithContext(options?: any) {
  return createClientHead(options)
}

export function createServerHeadWithContext(options?: any) {
  return createServerHead({
    disableDefaults: true,
    ...options,
  })
}

// eslint-disable-next-line import/no-mutable-exports
export let activeDom: JSDOM | null = null

export function useDOMHead(options: CreateHeadOptions = {}) {
  activeDom = useDom()
  return createClientHeadWithContext({
    document: activeDom.window.document,
    ...options,
  })
}

export function useDelayedSerializedDom() {
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(activeDom!.serialize()), 250)
  })
}
