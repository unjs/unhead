import { compileTags, createHead, dynamicValue, renderSSRHead } from 'unhead/compiled/server'
import { describe, expect, it } from 'vitest'

describe('memo isolation after a value getter changes entries', () => {
  it.each([false, true])('preserves later request titles when a getter disposes itself, warm memo: %s', (warm) => {
    const result = compileTags({ title: dynamicValue(0) }, { dynamicValues: 1 })
    if (result._tag !== 'Ok')
      throw new Error(result.reason)
    const render = () => {
      const head = createHead({ disableDefaults: true })
      head.push(result.tags, { values: ['Later request'] })
      return renderSSRHead(head).headTags
    }
    if (warm)
      expect(render()).toBe('<title>Later request</title>')

    const head = createHead({ disableDefaults: true })
    const entry = head.push(result.tags, {
      values: () => {
        entry.dispose()
        return ['Disposed']
      },
    })
    expect(renderSSRHead(head).headTags).toBe('')
    expect(render()).toBe('<title>Later request</title>')
  })

  it('preserves later request titles when a getter patches an earlier entry', () => {
    const original = compileTags({ title: 'Original' })
    const replacement = compileTags({ title: 'Replacement' })
    const trigger = compileTags({ meta: [{ name: 'description', content: dynamicValue(0) }] }, { dynamicValues: 1 })
    if (original._tag !== 'Ok' || replacement._tag !== 'Ok' || trigger._tag !== 'Ok')
      throw new Error('Fixture must compile')

    const head = createHead({ disableDefaults: true })
    const earlier = head.push(original.tags)
    head.push(trigger.tags, {
      values: () => {
        earlier.patch(replacement.tags)
        return ['Description']
      },
    })
    expect(renderSSRHead(head).headTags).toContain('<title>Replacement</title>')

    const later = createHead({ disableDefaults: true })
    later.push(original.tags)
    later.push(trigger.tags, { values: ['Description'] })
    expect(renderSSRHead(later).headTags).toContain('<title>Original</title>')
  })
})
