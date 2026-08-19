import { createStreamableHead, inspectStreamedTags, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

function pending(head: any) {
  return inspectStreamedTags(head).pendingTags.map((t: any) => t.tag)
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
    function flags(input: any) {
      const { head } = createStreamableHead({ disableDefaults: true })
      head.push(input)
      return inspectStreamedTags(head).tagsHiddenFromBots.length > 0
    }

    it.each([
      ['title', { title: 'Home' }],
      ['titleTemplate', { titleTemplate: '%s | Site' }],
      ['base', { base: { href: '/app/' } }],
      ['meta description', { meta: [{ name: 'description', content: 'x' }] }],
      ['meta robots', { meta: [{ name: 'robots', content: 'index' }] }],
      ['meta googlebot', { meta: [{ name: 'googlebot', content: 'index' }] }],
      ['meta keywords', { meta: [{ name: 'keywords', content: 'a,b' }] }],
      ['og property', { meta: [{ property: 'og:title', content: 'x' }] }],
      ['twitter name', { meta: [{ name: 'twitter:card', content: 'summary' }] }],
      ['article property', { meta: [{ property: 'article:author', content: 'x' }] }],
      ['book property', { meta: [{ property: 'book:isbn', content: 'x' }] }],
      ['profile property', { meta: [{ property: 'profile:username', content: 'x' }] }],
      ['fb property', { meta: [{ property: 'fb:app_id', content: '1' }] }],
      ['al property', { meta: [{ property: 'al:ios:url', content: 'x' }] }],
      ['link canonical', { link: [{ rel: 'canonical', href: '/' }] }],
      ['link alternate', { link: [{ rel: 'alternate', href: '/fr', hreflang: 'fr' }] }],
      ['link amphtml', { link: [{ rel: 'amphtml' as 'canonical', href: '/amp' }] }],
      ['link prev', { link: [{ rel: 'prev', href: '/1' }] }],
      ['link next', { link: [{ rel: 'next', href: '/3' }] }],
      ['link author', { link: [{ rel: 'author', href: '/me' }] }],
      ['link license', { link: [{ rel: 'license', href: '/l' }] }],
      ['ld+json script', { script: [{ type: 'application/ld+json', innerHTML: '{}' }] }],
    ])('flags %s', (_name, input) => {
      expect(flags(input)).toBe(true)
    })

    it.each([
      ['preload', { link: [{ rel: 'preload', href: '/a.js', as: 'script' }] }],
      ['prefetch', { link: [{ rel: 'prefetch', href: '/a.js' }] }],
      ['preconnect', { link: [{ rel: 'preconnect', href: 'https://cdn.example' }] }],
      ['dns-prefetch', { link: [{ rel: 'dns-prefetch', href: 'https://cdn.example' }] }],
      ['modulepreload', { link: [{ rel: 'modulepreload', href: '/a.js' }] }],
      ['stylesheet', { link: [{ rel: 'stylesheet', href: '/a.css' }] }],
      ['icon', { link: [{ rel: 'icon', href: '/f.ico' }] }],
      ['manifest', { link: [{ rel: 'manifest', href: '/m.json' }] }],
      ['plain script', { script: [{ src: '/app.js' }] }],
      ['style', { style: [{ innerHTML: 'body{color:red}' }] }],
      ['noscript', { noscript: [{ innerHTML: '<p>no js</p>' }] }],
      ['htmlAttrs', { htmlAttrs: { lang: 'en' } }],
      ['bodyAttrs', { bodyAttrs: { class: 'dark' } }],
      ['templateParams', { templateParams: { site: 'Acme' } }],
      ['unrelated meta', { meta: [{ name: 'theme-color', content: '#fff' }] }],
    ])('ignores %s', (_name, input) => {
      expect(flags(input)).toBe(false)
    })

    it('ignores body-positioned tags that would otherwise be flagged', () => {
      expect(flags({ script: [{ type: 'application/ld+json', innerHTML: '{}', tagPosition: 'bodyClose' }] })).toBe(false)

      const { head } = createStreamableHead({ disableDefaults: true })
      head.push({ meta: [{ name: 'description', content: 'x' }] }, { tagPosition: 'bodyOpen' })
      expect(inspectStreamedTags(head).tagsHiddenFromBots).toEqual([])
    })

    it('matches a rel that appears in a multi-value link', () => {
      expect(flags({ link: [{ rel: 'alternate stylesheet' as 'alternate', href: '/x', hreflang: 'fr' }] })).toBe(true)
    })

    it('matches case-insensitively', () => {
      expect(flags({ meta: [{ property: 'OG:TITLE', content: 'x' }] })).toBe(true)
      expect(flags({ link: [{ rel: 'CANONICAL' as 'canonical', href: '/' }] })).toBe(true)
      expect(flags({ script: [{ type: 'Application/LD+JSON', innerHTML: '{}' }] })).toBe(true)
    })

    it('returns the flagged tags, not just a count', () => {
      const { head } = createStreamableHead({ disableDefaults: true })
      head.push({
        title: 'Home',
        link: [{ rel: 'canonical', href: '/' }, { rel: 'preload', href: '/a.js', as: 'script' }],
      })

      const { pendingTags, tagsHiddenFromBots } = inspectStreamedTags(head)
      expect(pendingTags).toHaveLength(3)
      expect(tagsHiddenFromBots.map(t => t.tag)).toEqual(['title', 'link'])
      expect(tagsHiddenFromBots[1]!.props.rel).toBe('canonical')
    })
  })
})
