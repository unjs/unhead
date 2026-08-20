import type { HeadValidationRule, ValidationRuleId } from 'unhead/plugins'
import { ValidatePlugin } from 'unhead/plugins'
import { createStreamableHead, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

function setup(only?: readonly ValidationRuleId[]) {
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

  it('lets a narrowed instance coexist with one the app registers', () => {
    const auto: HeadValidationRule[] = []
    const manual: HeadValidationRule[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      plugins: [ValidatePlugin({ onReport: r => manual.push(...r) })],
    })
    head.use(ValidatePlugin({
      onReport: r => auto.push(...r),
      key: 'validate:streaming',
      only: ['streamed-tag-hidden-from-bots'],
    }))
    renderShell(head)
    head.push({ link: [{ rel: 'canonical', href: '/' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(manual.map(r => r.id)).toContain('missing-title')
    expect(auto.map(r => r.id)).toEqual(['streamed-tag-hidden-from-bots'])
  })

  it('drops a second instance that shares the default key', () => {
    const first: HeadValidationRule[] = []
    const second: HeadValidationRule[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      plugins: [ValidatePlugin({ onReport: r => first.push(...r) })],
    })
    head.use(ValidatePlugin({ onReport: r => second.push(...r) }))
    renderShell(head)

    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual([])
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
