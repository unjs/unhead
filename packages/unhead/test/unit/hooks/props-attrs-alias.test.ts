import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('tag.props / tag.attrs alias', () => {
  it('a tags:resolve hook reading tag.props sees the same values as tag.attrs', async () => {
    const seenViaProps: unknown[] = []
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              seenViaProps.push(tag.props!.content)
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'read via props' }] })

    const result = await renderSSRHead(head)
    expect(seenViaProps).toEqual(['read via props'])
    expect(result.headTags).toContain('content="read via props"')
  })

  it('a tags:resolve hook writing tag.attrs is reflected in the rendered output', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              tag.attrs.content = 'written via attrs'
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    const result = await renderSSRHead(head)
    expect(result.headTags).toContain('content="written via attrs"')
    expect(result.headTags).not.toContain('content="original"')
  })

  it('a hook replacing tag.props wholesale still renders the replacement', async () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta')
              tag.props = { name: 'description', content: 'replaced via props' }
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'original' }] })

    const result = await renderSSRHead(head)
    expect(result.headTags).toContain('content="replaced via props"')
    expect(result.headTags).not.toContain('content="original"')
  })
})
