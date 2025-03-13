import { fc, it } from '@fast-check/vitest'
import { renderSSRHead } from '@unhead/ssr'
import { useHead } from '../../src/composables'
import { createHead } from '../../src/server'

fc.configureGlobal({ numRuns: Number.POSITIVE_INFINITY })

describe.runIf(process.env.FUZZY_TEST)('useHead', () => {
  it('test', async () => {
    const [a, b, c] = ['', '', { '': { toString: '' } }]
    const head = createHead()
    useHead(head, {
      title: b,
      link: [a, c],
      meta: [{ a, b, c }, c],
      style: a,
      script: c,
      c,
    })
    await renderSSRHead(head)
  })
  it.prop([fc.string(), fc.string(), fc.anything()])('breaks', async (a, b, c) => {
    const head = createHead()
    useHead(head, {
      title: b,
      link: [a, c],
      meta: [{ a, b, c }, c],
      style: a,
      script: c,
      c,
    })
    await renderSSRHead(head)
  })
})
