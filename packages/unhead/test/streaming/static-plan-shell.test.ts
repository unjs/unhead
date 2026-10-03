import { pushStaticPlan } from 'unhead/server'
import { createStreamableHead, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

describe('static plan entries in the stream', () => {
  it('a plan entry pushed before the shell renders in the shell', () => {
    const { head } = createStreamableHead()
    pushStaticPlan(head, [
      [50, 'meta:static-in-shell', '<meta name="static-in-shell" content="1">'],
    ])
    head.push({ title: 'Streamed Page' })

    const shell = renderShell(head)
    expect(shell.headTags).toContain('<meta name="static-in-shell" content="1">')
    expect(shell.headTags).toContain('<title>Streamed Page</title>')
  })

  it('does not crash renderSSRHeadSuspenseChunk when a plan entry is still pending', () => {
    const { head } = createStreamableHead()
    pushStaticPlan(head, [
      [50, 'meta:static-late', '<meta name="static-late" content="1">'],
    ])

    expect(() => renderSSRHeadSuspenseChunk(head)).not.toThrow()
  })
})
