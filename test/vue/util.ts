/* eslint-disable vue/one-component-per-file */
import type { Component, InjectionKey, Ref } from 'vue'
import { KeepAlive, createApp, createSSRApp, defineComponent, h, provide, ref } from 'vue'
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

export function mount<V extends Component>(Comp: V) {
  const el = document.createElement('div')
  const app = createApp(Comp)

  const unmount = () => app.unmount()
  const comp = app.mount(el) as any as VM<V>
  comp.unmount = unmount
  return comp
}

export const Key: InjectionKey<Ref<number>> = Symbol('num')

export function useKeepAliveSetup<V>(setup: () => V) {
  const Comp = defineComponent({
    setup,
    render() {
      return h('div', [])
    },
  })

  const Provider = defineComponent({
    components: Comp,
    setup() {
      const visible = ref(true)
      provide(Key, ref(1))
      return { visible }
    },
    render() {
      return h('div', [h(KeepAlive, [this.visible ? h(Comp, { ref: 'comp' }) : ''])])
    },
  })
  const app = mount(Provider)
  return app
}
