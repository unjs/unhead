import { createHead, renderSSRHead } from 'unhead/server'
import { bench, describe } from 'vitest'

// per-request head creation (Nuxt-style): exercises the default init entry
// normalization cost on every request
describe('ssr default init per-request', () => {
  bench('createHead + render (defaults only)', () => {
    const head = createHead()
    renderSSRHead(head)
  })

  bench('createHead + push + render', () => {
    const head = createHead()
    head.push({
      title: 'Harlan Wilton',
      meta: [
        { name: 'description', content: 'Open source developer' },
      ],
      link: [
        { rel: 'stylesheet', href: '/page.css' },
      ],
    })
    renderSSRHead(head)
  })
})
