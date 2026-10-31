import { createApp } from './app'
import { createHead } from '@unhead/vue/precompiled'
import './style.css'

const app = createApp()
const head = createHead()
app.use(head)

app.mount('#app')
