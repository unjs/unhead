import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('entries:normalize pushing entries mid-resolve', () => {
  it('an entry pushed by a listener is deferred to the next resolve', () => {
    let pushed = false
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'entries:normalize': () => {
          if (!pushed) {
            pushed = true
            head.push({ meta: [{ name: 'injected', content: 'yes' }] })
          }
        },
      },
    })
    head.push({ title: 'first' })
    // the entries snapshot is taken before the loop, so the pushed entry must
    // not feed back into this same resolve (and must not loop forever if a
    // listener pushes per entry)
    const first = renderSSRHead(head)
    expect(first.headTags).toContain('first')
    expect(first.headTags).not.toContain('injected')
    // it resolves on the next render
    const second = renderSSRHead(head)
    expect(second.headTags).toContain('injected')
  })
})
