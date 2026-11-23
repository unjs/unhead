import { createHead } from '@unhead/vue/client'
import { createStreamableHead } from '@unhead/vue/stream/client'
import { createSSRApp, h, Suspense } from 'vue'
import { useScript } from '../../src/scripts'

export function start(streaming: boolean) {
  const head = streaming ? createStreamableHead({ document }) : createHead({ document })
  if (!head)
    throw new Error('The streaming factory did not supply a head.')
  const state = { resolved: false }
  const Child = {
    async setup() {
      const script = useScript('/setup.js', { trigger: 'manual' })
      await script.load()
      return () => h('div', 'ready')
    },
  }
  const app = createSSRApp({
    render: () => h(Suspense, { onResolve: () => { state.resolved = true } }, { default: () => h(Child) }),
  }).use(head)
  app.mount('#app')
  return {
    get resolved() { return state.resolved },
    unmount: () => app.unmount(),
  }
}
