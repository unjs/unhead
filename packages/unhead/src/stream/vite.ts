import type { Plugin } from 'vite'

export const VIRTUAL_CLIENT_ID = 'virtual:@unhead/streaming-client'
export const VIRTUAL_IIFE_ID = 'virtual:@unhead/streaming-iife.js'
const RESOLVED_ID = `\0${VIRTUAL_CLIENT_ID}`
const RESOLVED_IIFE_ID = `\0${VIRTUAL_IIFE_ID}`

export interface StreamingPluginOptions {
  /** Framework package e.g. '@unhead/vue' */
  framework: string
  /** Plugin name (optional, defaults to `${framework}:streaming`) */
  name?: string
  /** Transform function - return true if transformed */
  transform: Plugin['transform']
  /**
   * How to load the streaming client:
   * - 'async': Load as async script (non-blocking, may have brief queue delay)
   * - 'inline': Inline the IIFE directly in HTML (larger HTML, but immediate execution)
   * - 'module': Use ES module import (original behavior, waits for bundle)
   * @default 'async'
   */
  mode?: 'async' | 'inline' | 'module'
}

// IIFE code will be loaded at config time
let iifeCode: string | undefined
let iifeCodeLoaded = false

export function createStreamingPlugin(options: StreamingPluginOptions): Plugin {
  const { framework, name, mode = 'async' } = options

  return {
    name: name ?? `${framework}:streaming`,
    enforce: 'pre',

    async configResolved() {
      if (!iifeCodeLoaded) {
        iifeCodeLoaded = true
        // After build, iife.mjs exports streamingIifeCode string (not the source module)
        const mod = await import('unhead/stream/iife') as unknown as { streamingIifeCode: string }
        iifeCode = mod.streamingIifeCode
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_CLIENT_ID || id === `/${VIRTUAL_CLIENT_ID}`)
        return RESOLVED_ID
      if (id === VIRTUAL_IIFE_ID || id === `/${VIRTUAL_IIFE_ID}`)
        return RESOLVED_IIFE_ID
    },

    load(id, opts) {
      if (id === RESOLVED_ID) {
        if (opts?.ssr)
          return 'export {}'
        // ES module client - uses framework's createHead
        return `import{createHead}from'${framework}/client'
const s=window.__unhead__;if(s){const q=s._q;s._q=[];const h=createHead({document});q.forEach(e=>h.push(e));s.push=e=>h.push(e);s._head=h}`
      }
      if (id === RESOLVED_IIFE_ID) {
        if (opts?.ssr)
          return ''
        if (!iifeCode)
          throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
        return iifeCode
      }
    },

    transformIndexHtml() {
      if (mode === 'inline') {
        if (!iifeCode)
          throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
        return [{
          tag: 'script',
          children: iifeCode,
          injectTo: 'head-prepend',
        }]
      }

      if (mode === 'async') {
        // Async script - non-blocking, loads IIFE bundle
        return [{
          tag: 'script',
          attrs: { async: true, src: `/${VIRTUAL_IIFE_ID}` },
          injectTo: 'head-prepend',
        }]
      }

      // Module mode (original) - dynamic import
      return [{
        tag: 'script',
        children: `import("/${VIRTUAL_CLIENT_ID}")`,
        injectTo: 'head-prepend',
      }]
    },

    transform: options.transform,
  }
}
