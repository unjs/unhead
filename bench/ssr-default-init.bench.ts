import { createHead, renderSSRHead } from 'unhead/server'
import { it } from 'vitest'

// per-request head creation (Nuxt-style): exercises the default init entry
// normalization cost on every request
it('ssr default init per-request', async ({ bench }) => {
  await bench.compare(
    bench('createHead + render (defaults only)', () => {
      const head = createHead()
      renderSSRHead(head)
    }),
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
    }),
  )
})
