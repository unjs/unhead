import type { FixturePayload } from './app'
import { createHead } from '@unhead/vue/client'
import { createFixtureApp, requestHooks } from './app'

const payload: FixturePayload = JSON.parse(document.querySelector('#fixture-payload')!.textContent!)
const head = createHead({ init: [payload.input], hooks: requestHooks(payload.request) })
const app = createFixtureApp()
app.use(head)
app.mount('#app')
