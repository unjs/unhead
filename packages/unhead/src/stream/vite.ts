import type { Plugin } from 'vite'
import MagicString from 'magic-string'

export type { Plugin as VitePlugin }

export const VIRTUAL_CLIENT_ID = 'virtual:@unhead/streaming-client'
const RESOLVED_ID = `\0${VIRTUAL_CLIENT_ID}`

export interface StreamingPluginContext {
  code: string
  id: string
  isSSR: boolean
  s: MagicString
}

export interface StreamingPluginOptions {
  /** Framework package e.g. '@unhead/vue' */
  framework: string
  /** Plugin name */
  name: string
  /** File include pattern */
  include: RegExp
  /** Transform function - return true if transformed */
  transform: (ctx: StreamingPluginContext) => boolean
}

function hasHeadCalls(code: string): boolean {
  return code.includes('useHead') || code.includes('useSeoMeta') || code.includes('useHeadSafe')
}

export function createStreamingPlugin(options: StreamingPluginOptions): Plugin {
  const { framework, name, include, transform } = options

  return {
    name,
    enforce: 'pre',

    resolveId: id => (id === VIRTUAL_CLIENT_ID || id === `/${VIRTUAL_CLIENT_ID}`) ? RESOLVED_ID : undefined,

    load(id, opts) {
      if (id !== RESOLVED_ID)
        return
      if (opts?.ssr)
        return 'export {}'
      return `import{createHead}from'${framework}/client'
const s=window.__unhead__;if(s){const q=s._q||[],h=createHead({document});q.forEach(e=>h.push(e));window.__unhead__={_q:[],push:e=>h.push(e),_head:h}}`
    },

    transformIndexHtml: () => [
      { tag: 'script', children: `window.__unhead__={_q:[],push(e){this._q.push(e)}}`, injectTo: 'head-prepend' },
      { tag: 'script', attrs: { type: 'module', async: true, src: `/${VIRTUAL_CLIENT_ID}` }, injectTo: 'head-prepend' },
    ],

    transform(code, id, opts) {
      if (!include.test(id) || !hasHeadCalls(code) || code.includes('HeadStream'))
        return null

      const s = new MagicString(code)
      if (!transform({ code, id, isSSR: opts?.ssr ?? false, s }))
        return null

      return { code: s.toString(), map: s.generateMap({ includeContent: true, source: id }) }
    },
  }
}
