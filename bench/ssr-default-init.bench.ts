import { createHead, renderSSRHead } from 'unhead/server'
import { describe, it } from 'vitest'

// per-request head creation (Nuxt-style): exercises the default init entry
// normalization cost on every request
describe('ssr default init per-request', () => {
  it('createHead + render (defaults only)', async ({ bench }) => {
    await bench('createHead + render (defaults only)', () => {
      const head = createHead()
      renderSSRHead(head)
    }).run()
  })

  it('createHead + push + render', async ({ bench }) => {
    await bench('createHead + push + render', () => {
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
    }).run()
  })
})
