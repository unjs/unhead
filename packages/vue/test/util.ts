// @vitest-environment jsdom
import type { JSDOM } from 'jsdom'
import type { CreateClientHeadOptions, CreateServerHeadOptions } from 'unhead/types'
import type { App, Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createApp, createSSRApp, h } from 'vue'
import { VueHeadMixin } from '../src'
import { createHead as createClientHead } from '../src/client'
import { createHead as createServerHead, renderSSRHead } from '../src/server'

export function csrVueAppWithUnhead(dom: JSDOM, fn: () => void | Promise<void>, options?: CreateClientHeadOptions) {
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
  // globalThis.document = window.document
  // globalThis.window = window
  dom.window.document.body.innerHTML = '<div id="app"></div>'
  // only in jsdom environment can we mount
  if (typeof document !== 'undefined') {
    app.mount('#app')
  }
  return head
}

export async function ssrVueAppWithUnhead(fn: (head: ReturnType<typeof createServerHead>) => void | Promise<void>, options?: CreateServerHeadOptions) {
  const head = createServerHead({
    disableDefaults: true,
    ...options,
  })
  const app = createSSRApp({
    async setup() {
      fn(head)
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

export async function ssrRenderOptionsHead(input: any, options?: CreateServerHeadOptions) {
  const head = createServerHead({
    disableDefaults: true,
    ...options,
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
