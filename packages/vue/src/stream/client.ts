import type { CreateStreamableClientHeadOptions } from 'unhead/types'
import type { VueHeadClient } from '../types'
import { createDebouncedFn, createHead, renderDOMHead } from 'unhead/client'
import { defineComponent } from 'vue'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

/**
 * Client-side HeadStream - renders nothing (script already executed during SSR streaming)
 */
export const HeadStream = defineComponent({
  name: 'HeadStream',
  setup() {
    return () => null
  },
})

/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): VueHeadClient {
  const { streamKey = '__unhead__', ...rest } = options
  const doc = rest.document || (typeof document !== 'undefined' ? document : undefined)
  const win = doc?.defaultView as any
  const existing = win?.[streamKey]?._head

  // Adopt existing core instance created by virtual module
  if (existing) {
    existing.resolvedOptions.propResolvers = [VueResolver, ...(existing.resolvedOptions.propResolvers || [])]
    const vueHead = existing as VueHeadClient
    vueHead.install = vueInstall(vueHead)
    return vueHead
  }

  // Fallback: create fresh instance (non-streaming or SSG case)
  const head = createHead({
    ...rest,
    document: doc,
    propResolvers: [VueResolver],
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
  }) as VueHeadClient
  head.install = vueInstall(head)

  // Consume streaming queue if present
  if (win) {
    const streamQueue = win[streamKey]
    if (streamQueue) {
      const queue = streamQueue._q || []
      queue.forEach((entry: any) => head.push(entry))
    }
    // Replace queue with direct push to head instance
    win[streamKey] = {
      _q: [],
      push: (entry: any) => head.push(entry),
      _head: head,
    }
  }

  return head
}

export type {
  CreateStreamableClientHeadOptions,
  VueHeadClient,
}

export * from '../client'
