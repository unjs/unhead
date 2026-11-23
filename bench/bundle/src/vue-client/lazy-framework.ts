import type { App } from 'vue'
import { createDeferredHead } from '@unhead/vue/lazy'

declare const app: App
const head = createDeferredHead({}, (_app, lifecycle) => {
  document.addEventListener('hydrated', () => lifecycle.finishHydration(load => setTimeout(load)))
})
app.use(head)
head.push({ title: 'Test', meta: [{ name: 'description', content: 'Test' }] })
