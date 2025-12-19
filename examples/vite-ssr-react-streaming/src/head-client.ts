// Minimal entry that initializes unhead client early
// Loaded async in <head> to process streaming updates immediately
import { createStreamableHead } from '@unhead/react/client'

// Wrap push to log updates
if ((window as any).__unhead__) {
  const orig = (window as any).__unhead__.push
  ;(window as any).__unhead__.push = (e: any) => {
    const d = e.title ? `title: ${String(e.title).slice(0, 20)}`
      : e.meta?.[0] ? `meta: ${e.meta[0].name || e.meta[0].property || 'other'}`
      : e.script?.[0] ? 'script: ld+json'
      : 'update'
    ;(window as any).__headLog?.(d)
    return orig.call((window as any).__unhead__, e)
  }
}

// Create head instance - this consumes the queue and replaces push() to process immediately
const head = createStreamableHead()

// Re-wrap push after createStreamableHead replaces it
const streamPush = (window as any).__unhead__?.push?.bind((window as any).__unhead__)
if ((window as any).__unhead__ && streamPush) {
  ;(window as any).__unhead__.push = (e: any) => {
    const d = e.title ? `title: ${String(e.title).slice(0, 20)}`
      : e.meta?.[0] ? `meta: ${e.meta[0].name || e.meta[0].property || 'other'}`
      : e.script?.[0] ? 'script: ld+json'
      : 'update'
    ;(window as any).__headLog?.(d)
    return streamPush(e)
  }
}

// Expose for entry-client.tsx to reuse
;(window as any).__unheadInstance__ = head
