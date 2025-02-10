// @vitest-environment jsdom

import type { CreateHeadOptions, Head, SSRHeadPayload } from 'unhead/types'
import type { App, Component } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { VueHeadMixin } from '@unhead/vue'
import { createHead as createClientHead } from '@unhead/vue/client'
import { createHead as createServerHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { JSDOM } from 'jsdom'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { createApp, createSSRApp, h } from 'vue'

export function csrVueAppWithUnhead(dom: JSDOM, fn: () => void | Promise<void>) {
  const head = createClientHead({
    document: dom.window.document,
    plugins: [
      TemplateParamsPlugin,
    ],
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
    plugins: [
      ...(options?.plugins || []),
      TemplateParamsPlugin,
    ],
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
    plugins: [
      TemplateParamsPlugin,
    ],
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
    plugins: [
      // TODO optional
      TemplateParamsPlugin,
    ],
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

export function useDom(payload?: Partial<SSRHeadPayload>, extra?: Partial<SSRHeadPayload>) {
  if (typeof window !== 'undefined') {
    // clear html attributes
    ;[...window.document.documentElement.attributes].forEach((attr) => {
      window.document.documentElement.removeAttribute(attr.name)
    })
    window.document.head.innerHTML = ''
    window.document.body.innerHTML = ''
    // just apply the below to the current document
    const attrsString = `${extra?.htmlAttrs || ''}${payload?.htmlAttrs || ''}`
    // split into key => value
    const attrsObj = attrsString.split(' ').reduce((acc, attr) => {
      const [key, value] = attr.split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
    Object.entries(attrsObj).forEach(([key, value]) => {
      if (key.length) {
        window.document.documentElement.setAttribute(key, String(value).replaceAll('"', ''))
      }
    })
    window.document.documentElement.innerHTML = `<head>
${payload?.headTags || ''}
</head>
<body ${extra?.bodyAttrs || ''} ${payload?.bodyAttrs || ''}>
${payload?.bodyTagsOpen || ''}
<div>
<h1>hello world</h1>
</div>
${payload?.bodyTags || ''}
</body>
`
    return {
      window,
      serialize: () => window.document.documentElement.outerHTML,
    } as any as JSDOM
  }
  return new JSDOM(
    `<!DOCTYPE html>
<html ${extra?.htmlAttrs || ''}${payload?.htmlAttrs || ''}>
<head>
${payload?.headTags || ''}
</head>
<body ${extra?.bodyAttrs || ''} ${payload?.bodyAttrs || ''}>
${payload?.bodyTagsOpen || ''}
<div>
<h1>hello world</h1>
</div>
${payload?.bodyTags || ''}
</body>
</html>
`,
  )
}

export const basicSchema: Head = {
  htmlAttrs: {
    lang: 'en',
    dir: 'ltr',
  },
  bodyAttrs: {
    class: 'dark',
  },
  script: [
    {
      src: 'https://cdn.example.com/script.js',
    },
  ],
  meta: [
    {
      charset: 'utf-8',
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: 'https://cdn.example.com/favicon.ico',
    },
  ],
}
