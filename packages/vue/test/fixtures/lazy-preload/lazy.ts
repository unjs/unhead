import { createHead } from '@unhead/vue/lazy'

const head = createHead()
document.addEventListener('activate-head', () => head.load())
