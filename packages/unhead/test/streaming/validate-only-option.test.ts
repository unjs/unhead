import type { HeadValidationRule } from 'unhead/plugins'
import { ValidatePlugin } from 'unhead/plugins'
import { createStreamableHead, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

function setup(only?: any) {
  const reported: HeadValidationRule[] = []
  const { head } = createStreamableHead({
    disableDefaults: true,
    plugins: [ValidatePlugin({ onReport: r => reported.push(...r), only })],
  })
  return { head, reported }
}

describe('validatePlugin only', () => {
  it('reports everything when unset', () => {
    const { head, reported } = setup()
    renderShell(head)

    expect(reported.map(r => r.id)).toContain('missing-title')
  })

  it('silences every rule outside the list', () => {
    const { head, reported } = setup(['streamed-tag-hidden-from-bots'])
    renderShell(head)

    expect(reported).toEqual([])
  })

  it('still reports the rule it was narrowed to', () => {
    const { head, reported } = setup(['streamed-tag-hidden-from-bots'])
    renderShell(head)
    head.push({ link: [{ rel: 'canonical', href: '/' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(reported.map(r => r.id)).toEqual(['streamed-tag-hidden-from-bots'])
  })

  it('wins over an explicit rules entry', () => {
    const reported: HeadValidationRule[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      plugins: [ValidatePlugin({
        onReport: r => reported.push(...r),
        only: ['streamed-tag-hidden-from-bots'],
        rules: { 'missing-title': 'warn' },
      })],
    })
    renderShell(head)

    expect(reported).toEqual([])
  })
})
