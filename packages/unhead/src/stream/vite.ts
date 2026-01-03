import type { Plugin } from 'vite'

export const VIRTUAL_CLIENT_ID = 'virtual:@unhead/streaming-client'
const RESOLVED_ID = `\0${VIRTUAL_CLIENT_ID}`

export interface StreamingPluginOptions {
  /** Framework package e.g. '@unhead/vue' */
  framework: string
  /** Plugin name (optional, defaults to `${framework}:streaming`) */
  name?: string
  /** Transform function - return true if transformed */
  transform: Plugin['transform']
}

export function createStreamingPlugin(options: StreamingPluginOptions): Plugin {
  const { framework, name } = options

  return {
    name: name ?? `${framework}:streaming`,
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

    transform: options.transform,
  }
}
