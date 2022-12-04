import { createHead } from 'unhead'
import type { JSDOM } from 'jsdom'
import type { CreateHeadOptions } from '@unhead/schema'
import { useDom } from '../../fixtures'

// eslint-disable-next-line import/no-mutable-exports
export let activeDom: JSDOM | null = null

export function useDOMHead(options: CreateHeadOptions = {}) {
  activeDom = useDom()
  return createHead({
    document: activeDom.window.document,
    ...options,
  })
}

export function useDelayedSerializedDom() {
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(activeDom!.serialize()), 250)
  })
}
