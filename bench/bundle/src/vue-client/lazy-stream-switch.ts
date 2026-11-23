import type { App } from 'vue'
import { createStreamableHeadAfterHydration as createStreamableHead } from '@unhead/vue/lazy'

declare const app: App
const head = createStreamableHead()
if (head) {
  app.use(head)
  head.push({ title: 'Test', meta: [{ name: 'description', content: 'Test' }] })
}
