import type { Component, Plugin } from 'vue-vapor'
import { useHead } from '@unhead/vue'
import { createHead, renderDOMHead } from '@unhead/vue/client'
import { createApp, defineComponent, defineVaporComponent, h, nextTick, ref, vaporInteropPlugin } from 'vue-vapor'
import Child from './Child.vue'

const VaporChild = defineVaporComponent({
  props: ['title'],
  setup(props) {
    useHead({
      title: () => props.title,
      meta: [{ name: 'robots', content: 'noindex' }],
    })
    const child = document.createElement('p')
    child.setAttribute('data-vapor-child', '')
    child.textContent = 'child'
    return child
  },
})

export function mount(kind: 'sfc' | 'component') {
  const head = createHead({ document })
  const visible = ref(true)
  const title = ref('child')
  // Interop accepts Vapor components; h() still declares VDOM component types.
  const component = (kind === 'sfc' ? Child : VaporChild) as unknown as Component
  const app = createApp(defineComponent({
    setup() {
      useHead({ title: 'parent' })
      return () => h('div', visible.value ? [h(component, { title: title.value })] : [])
    },
  }))
  // The fixture uses Vue 3.6 types while Unhead's peer types use Vue 3.5.
  app.use(head as unknown as Plugin)
  app.use(vaporInteropPlugin)
  app.mount('#app')

  return {
    setVisible(value: boolean) {
      visible.value = value
    },
    setTitle(value: string) {
      title.value = value
    },
    async flush() {
      await nextTick()
      renderDOMHead(head, { document })
    },
    unmount() {
      app.unmount()
      renderDOMHead(head, { document })
    },
  }
}
