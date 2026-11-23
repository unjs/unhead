import type { ClientHeadHooks } from 'unhead/types'
import { createHead } from '@unhead/vue/client'
import { createStreamableHead } from '@unhead/vue/stream/client'
import { HookableCore } from 'hookable'
import { createSSRApp, h } from 'vue'

export function start(streaming: boolean, subscribe: boolean, supplied: boolean) {
  const updates: string[] = []
  const hookable = new HookableCore<ClientHeadHooks>()
  if (supplied)
    hookable.hook('entries:updated', () => { updates.push('supplied') })
  const options = { document, hookable: supplied ? hookable : undefined }
  const head = streaming ? createStreamableHead(options) : createHead(options)
  if (!head)
    throw new Error('The streaming factory did not supply a head.')
  if (subscribe)
    head.hooks!.hook('entries:updated', () => { updates.push('setup') })
  const app = createSSRApp({
    setup() {
      head.push({ title: 'Hydrated title' })
      return () => h('div', 'ready')
    },
  }).use(head)
  app.mount('#app')
  return { updates, unmount: () => app.unmount() }
}
