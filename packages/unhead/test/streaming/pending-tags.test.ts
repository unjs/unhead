import { createStreamableHead, getPendingTags, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

function names(head: any) {
  return getPendingTags(head).map(t => t.tag)
}

describe('getPendingTags', () => {
  it('reports the tags waiting to be flushed', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({
      title: 'Async Page',
      link: [{ rel: 'canonical', href: 'https://example.com/' }],
      script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' }],
    })

    expect(names(head)).toEqual(['title', 'link', 'script'])
  })

  it('carries tagPosition from the tag and from the entry option', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ script: [{ src: '/a.js', tagPosition: 'bodyClose' }] })
    head.push({ script: [{ src: '/b.js' }] }, { tagPosition: 'bodyOpen' })
    head.push({ meta: [{ name: 'description', content: 'in head' }] })

    expect(getPendingTags(head).map(t => [t.tag, t.tagPosition])).toEqual([
      ['script', 'bodyClose'],
      ['script', 'bodyOpen'],
      ['meta', undefined],
    ])
  })

  it('distinguishes element tags from attribute-only entries', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ htmlAttrs: { lang: 'en' }, bodyAttrs: { class: 'dark' }, titleTemplate: '%s | Site' })

    expect(names(head)).toEqual(['htmlAttrs', 'bodyAttrs', 'titleTemplate'])
  })

  it('is empty once entries are flushed', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ title: 'One' })
    renderShell(head)
    expect(getPendingTags(head)).toEqual([])

    head.push({ title: 'Two' })
    expect(names(head)).toEqual(['title'])
    renderSSRHeadSuspenseChunk(head)
    expect(getPendingTags(head)).toEqual([])
  })

  it('does not disturb the render that follows it', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ title: 'Kept', meta: [{ name: 'description', content: 'Kept' }] })

    const tags = getPendingTags(head)
    tags[0]!.tag = 'mutated' as any
    tags[1]!.props.content = 'mutated'

    expect(renderShell(head).headTags).toBe(
      '<title>Kept</title>\n<meta name="description" content="Kept">',
    )
  })

  it('runs the configured prop resolvers', () => {
    const { head } = createStreamableHead({
      disableDefaults: true,
      propResolvers: [(_key, value) => (typeof value === 'function' ? value() : value)],
    })
    head.push({ meta: [{ name: 'description', content: (() => 'lazy') as any }] })

    const tags = getPendingTags(head)
    expect(tags).toHaveLength(1)
    expect(tags[0]!.props.content).toBe('lazy')
  })
})
