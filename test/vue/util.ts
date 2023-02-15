import type { App, Component } from 'vue'
import { createApp, createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { VueHeadMixin, createHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'

export async function ssrRenderHeadToString(fn: () => void) {
  const head = createHead()
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
  const head = createHead()
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
type VM<V> = InstanceType<V> & { unmount(): void }

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
