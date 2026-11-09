import { JSDOM } from 'jsdom'
import { it } from 'vitest'
import { createHead } from '../packages/unhead/src/client'
import { createHead as createLazyHead } from '../packages/unhead/src/lazy'
import { createHead as createServerHead, renderSSRHead } from '../packages/unhead/src/server'

// Head work during hydration: create the head, push the entries of a page, end hydration.
const entries = Array.from({ length: 20 }, (_, i) => ({
  meta: [{ name: `meta-${i}`, content: `value ${i}` }],
  link: [{ rel: 'prefetch', href: `/chunk-${i}.js` }],
}))

const server = createServerHead({ disableDefaults: true })
entries.forEach(entry => server.push(entry))
const { headTags } = renderSSRHead(server)
const { document } = new JSDOM(`<!DOCTYPE html><html><head>${headTags}</head><body></body></html>`).window

it('hydration head work', async ({ bench }) => {
  await bench.compare(
    bench('default head', () => {
      const head = createHead({ document })
      head._b = true
      entries.forEach(entry => head.push(entry))
      head.render()
    }),
    bench('lazy head', () => {
      const head = createLazyHead({ document })
      entries.forEach(entry => head.push(entry))
      head.blockLoad()
    }),
  )
})
