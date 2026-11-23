import type { App } from 'vue'
import { createHeadAfterHydration as createHead } from '@unhead/vue/lazy'

declare const app: App
const head = createHead()
app.use(head)
head.push({ title: 'Test', meta: [{ name: 'description', content: 'Test' }] })
