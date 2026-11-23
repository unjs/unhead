import { createHead } from '@unhead/vue/client'
import { createStreamableHead } from '@unhead/vue/stream/client'
import { createSSRApp, h, Suspense } from 'vue'
import { useScript } from '../../src/scripts'

export function start(streaming: boolean, rejectRuntime = false) {
  const options = {
    document,
    lazyPlugins: rejectRuntime ? () => Promise.reject(new Error('Runtime plugin failed')) : undefined,
  }
  const head = streaming ? createStreamableHead(options) : createHead(options)
  if (!head)
    throw new Error('The streaming factory did not supply a head.')
  const state = { resolved: false, status: '', error: '', result: undefined as unknown, repeated: undefined as unknown }
  const Child = {
    async setup() {
      const script = useScript('/setup.js', { trigger: 'manual' })
      script.onError((error) => {
        state.error = error?.message || ''
      })
      state.result = await script.load()
      state.status = script.status.value
      if (rejectRuntime)
        state.repeated = await script.load()
      return () => h('div', 'ready')
    },
  }
  const app = createSSRApp({
    render: () => h(Suspense, { onResolve: () => { state.resolved = true } }, { default: () => h(Child) }),
  }).use(head)
  app.mount('#app')
  return {
    state,
    get resolved() { return state.resolved },
    unmount: () => app.unmount(),
  }
}
