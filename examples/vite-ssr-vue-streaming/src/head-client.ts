// Minimal entry that initializes unhead client early
// Loaded async in <head> to process streaming updates immediately
import { createStreamableHead } from '@unhead/vue/client'

console.log('[head-client] loading, queue size:', (window as any).__unhead__?._q?.length ?? 'no queue')

// Create head instance - this consumes the queue and replaces push() to process immediately
const head = createStreamableHead()

console.log('[head-client] head created, queue processed')

// Expose for entry-client.js to reuse
;(window as any).__unheadInstance__ = head
