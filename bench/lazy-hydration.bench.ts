import { JSDOM } from 'jsdom'
import { it, vi } from 'vitest'
import { createHead } from '../packages/unhead/src/client'
import { createHead as createLazyHead } from '../packages/unhead/src/lazy'
import { createHead as createServerHead, renderSSRHead } from '../packages/unhead/src/server'

// The production path: in development the lazy head imports its dev check on each hydration.
vi.stubEnv('NODE_ENV', 'production')

// Head work during hydration: create the head, push the entries of a page, end hydration with `render()`.
const entries = Array.from({ length: 20 }, (_, i) => ({
  meta: [{ name: `meta-${i}`, content: `value ${i}` }],
  link: [{ rel: 'prefetch', href: `/chunk-${i}.js` }],
}))

const server = createServerHead({ disableDefaults: true })
entries.forEach(entry => server.push(entry))
const { headTags } = renderSSRHead(server)
// a document per case, so the writes of one case never reach the other
const serverDocument = () => new JSDOM(`<!DOCTYPE html><html><head>${headTags}</head><body></body></html>`).window.document
const defaultDocument = serverDocument()
const lazyDocument = serverDocument()

it('hydration head work', async ({ bench }) => {
  await bench.compare(
    bench('default head', () => {
      const head = createHead({ document: defaultDocument })
      head._b = true
      entries.forEach(entry => head.push(entry))
      head.render()
    }),
    bench('lazy head', () => {
      const head = createLazyHead({ document: lazyDocument })
      entries.forEach(entry => head.push(entry))
      head.render()
    }),
  )
})
