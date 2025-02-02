import './style.css'
import { createApp } from './main'
import { createHead } from '@unhead/vue/client'

const { app } = createApp()
const head = createHead()
app.use(head)

app.mount('#app')
