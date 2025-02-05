// @vitest-environment jsdom

import type { CreateHeadOptions } from '@unhead/schema'
import type { JSDOM } from 'jsdom'
import type { App, Component } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { VueHeadMixin } from '@unhead/vue'
import { createHead as createClientHead } from '@unhead/vue/client'
import { createHead as createServerHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { createApp, createSSRApp, h } from 'vue'

export function csrVueAppWithUnhead(dom: JSDOM, fn: () => void | Promise<void>) {
  const head = createClientHead({
    document: dom.window.document,
  })
  const app = createApp({
    setup() {
      fn()
      return () => h('div', 'hello world')
    },
  })
  app.use(head)
  // globalThis.document = window.document
  // globalThis.window = window
  dom.window.document.body.innerHTML = '<div id="app"></div>'
  // only in jsdom environment can we mount
  if (typeof document !== 'undefined') {
    app.mount('#app')
  }
  return head
}

export async function ssrVueAppWithUnhead(fn: () => void | Promise<void>, options?: CreateHeadOptions) {
  const head = createServerHead({
    disableDefaults: true,
    ...options,
  })
  const app = createSSRApp({
    async setup() {
      fn()
      return () => '<div>hi</div>'
    },
  })
  app.use(head)
  await renderToString(app)
  return head
}

export async function ssrRenderHeadToString(fn: () => void) {
  const head = createServerHead({
    disableDefaults: true,
  })
  const app = createSSRApp({
    setup() {
      fn()
      return () => '<div>hi</div>'
    },
  })
  app.use(head)
  await renderToString(app)

  return renderSSRHead(head)
}

export async function ssrRenderOptionsHead(input: any) {
  const head = createServerHead({
    disableDefaults: true,
  })
  const app = createSSRApp({
    head() {
      return input
    },
    setup() {
      return () => '<div>hi</div>'
    },
  })
  app.mixin(VueHeadMixin)
  app.use(head)
  await renderToString(app)

  return renderSSRHead(head)
}

type InstanceType<V> = V extends { new (...arg: any[]): infer X } ? X : never
type VM<V> = InstanceType<V> & { unmount: () => void }

export function mount<V extends Component>(Comp: V, hook?: (p: { app: App }) => any) {
  const el = document.createElement('div')
  const app = createApp(Comp)
  const uses = hook?.({ app })
  if (uses)
    Object.values(uses).forEach(value => app.use(value as any))

  const unmount = () => app.unmount()
  const comp = app.mount(el) as any as VM<V>
  comp.unmount = unmount
  return comp
}
