import { createStreamableHead, inspectStreamedTags, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

function pending(head: any) {
  return inspectStreamedTags(head).pendingTags.map((t: any) => t.tag)
}

function hidden(head: any) {
  return inspectStreamedTags(head).tagsHiddenFromBots.map((t: any) => t.tag)
}

describe('inspectStreamedTags', () => {
  it('reports the tags waiting to be flushed', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({
      title: 'Async Page',
      link: [{ rel: 'canonical', href: 'https://example.com/' }],
      script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' }],
    })

    expect(pending(head)).toEqual(['title', 'link', 'script'])
  })

  it('carries tagPosition from the tag and from the entry option', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ script: [{ src: '/a.js', tagPosition: 'bodyClose' }] })
    head.push({ script: [{ src: '/b.js' }] }, { tagPosition: 'bodyOpen' })
    head.push({ meta: [{ name: 'description', content: 'in head' }] })

    expect(inspectStreamedTags(head).pendingTags.map(t => [t.tag, t.tagPosition])).toEqual([
      ['script', 'bodyClose'],
      ['script', 'bodyOpen'],
      ['meta', undefined],
    ])
  })

  it('distinguishes element tags from attribute-only entries', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ htmlAttrs: { lang: 'en' }, bodyAttrs: { class: 'dark' }, titleTemplate: '%s | Site' })

    expect(pending(head)).toEqual(['htmlAttrs', 'bodyAttrs', 'titleTemplate'])
  })

  it('is empty once entries are flushed', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ title: 'One' })
    renderShell(head)
    expect(inspectStreamedTags(head).pendingTags).toEqual([])

    head.push({ title: 'Two' })
    expect(pending(head)).toEqual(['title'])
    renderSSRHeadSuspenseChunk(head)
    expect(inspectStreamedTags(head).pendingTags).toEqual([])
  })

  it('does not disturb the render that follows it', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ title: 'Kept', meta: [{ name: 'description', content: 'Kept' }] })

    const { pendingTags } = inspectStreamedTags(head)
    pendingTags[0]!.tag = 'mutated' as any
    pendingTags[1]!.props.content = 'mutated'

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

    const { pendingTags } = inspectStreamedTags(head)
    expect(pendingTags).toHaveLength(1)
    expect(pendingTags[0]!.props.content).toBe('lazy')
  })

  describe('tagsHiddenFromBots', () => {
    it('flags tags a bot only reads from the served head', () => {
      const { head } = createStreamableHead({ disableDefaults: true })
      head.push({
        title: 'Home',
        link: [{ rel: 'canonical', href: 'https://example.com/' }],
        meta: [
          { name: 'description', content: 'Home page' },
          { name: 'robots', content: 'index' },
          { property: 'og:title', content: 'Home' },
        ],
        script: [{ type: 'application/ld+json', innerHTML: '{}' }],
      })

      expect(hidden(head)).toEqual(['title', 'link', 'meta', 'meta', 'meta', 'script'])
    })

    it('ignores tags a client-side patch can still serve', () => {
      const { head } = createStreamableHead({ disableDefaults: true })
      head.push({
        link: [
          { rel: 'preload', href: '/a.js', as: 'script' },
          { rel: 'stylesheet', href: '/a.css' },
        ],
        script: [{ src: '/app.js' }],
        style: [{ innerHTML: 'body{color:red}' }],
        htmlAttrs: { lang: 'en' },
        meta: [{ name: 'theme-color', content: '#fff' }],
      })

      expect(hidden(head)).toEqual([])
    })

    it('ignores body-positioned tags', () => {
      const { head } = createStreamableHead({ disableDefaults: true })
      head.push({ script: [{ type: 'application/ld+json', innerHTML: '{}', tagPosition: 'bodyClose' }] })
      head.push({ meta: [{ name: 'description', content: 'x' }] }, { tagPosition: 'bodyOpen' })

      expect(hidden(head)).toEqual([])
    })

    it('matches a rel that appears in a multi-value link', () => {
      const { head } = createStreamableHead({ disableDefaults: true })
      head.push({ link: [{ rel: 'alternate stylesheet' as 'alternate', href: '/x', hreflang: 'fr' }] })

      expect(hidden(head)).toEqual(['link'])
    })
  })
})
