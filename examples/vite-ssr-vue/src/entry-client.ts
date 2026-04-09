import './style.css'
import { createApp } from './main'
import { createHead } from '@unhead/vue/client'

const { app, router } = createApp()
const head = createHead()
app.use(head)

router.isReady().then(() => {
  app.mount('#app')
})
