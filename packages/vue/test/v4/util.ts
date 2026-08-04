import type { JSDOM } from 'jsdom'
import type { CreateHeadOptions } from '../../src/v4/client'
import type { CreateServerHeadOptions } from '../../src/v4/server'
import type { VueHeadClient } from '../../src/v4/types'
import { renderToString } from '@vue/server-renderer'
import { createApp, createSSRApp, h } from 'vue'
import { createHead as createClientHead } from '../../src/v4/client'
import { createHead as createServerHead } from '../../src/v4/server'

export function csrVueAppWithV4Head(dom: JSDOM, fn: () => void | Promise<void>, options?: CreateHeadOptions) {
  const head = createClientHead({
    document: dom.window.document,
    ...options,
  })
  const app = createApp({
    setup() {
      fn()
      return () => h('div', 'hello world')
    },
  })
  app.use(head)
  dom.window.document.body.innerHTML = '<div id="app"></div>'
  // only in jsdom environment can we mount
  if (typeof document !== 'undefined')
    app.mount('#app')
  return { head, app }
}

export async function ssrVueAppWithV4Head(fn: (head: VueHeadClient) => void | Promise<void>, options?: CreateServerHeadOptions) {
  const head = createServerHead({
    disableDefaults: true,
    ...options,
  })
  const app = createSSRApp({
    async setup() {
      fn(head)
      return () => h('div', 'hi')
    },
  })
  app.use(head)
  await renderToString(app)
  return head
}

/** waits out both the Vue scheduler and the v4 microtask render flush */
export function flush() {
  return new Promise(resolve => setTimeout(resolve, 0))
}
