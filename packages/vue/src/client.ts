import type { CreateClientHeadOptions, CreateStreamableClientHeadOptions } from 'unhead/types'
import type { VueHeadClient } from './types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { defineComponent } from 'vue'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

/**
 * Client-side HeadStreamScript - renders nothing (script already executed during SSR streaming)
 * Must match server's HeadStreamScript for hydration
 */
export const HeadStreamScript = defineComponent({
  name: 'HeadStreamScript',
  setup() {
    return () => null
  },
})

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient {
  const head = _createHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
    ...options,
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient {
  const { streamKey = '__unhead__', ...rest } = options
  const existing = (window as any)[streamKey]?._head

  // Adopt existing core instance created by virtual module
  if (existing) {
    existing.resolvedOptions.propResolvers = [VueResolver, ...(existing.resolvedOptions.propResolvers || [])]
    const vueHead = existing as VueHeadClient
    vueHead.install = vueInstall(vueHead)
    return vueHead
  }

  // Fallback: create fresh instance (non-streaming or SSG case)
  const head = _createHead({
    ...rest,
    propResolvers: [VueResolver],
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
  }) as VueHeadClient
  head.install = vueInstall(head)
  return head
}

export type {
  CreateClientHeadOptions,
  CreateStreamableClientHeadOptions,
  VueHeadClient,
}
