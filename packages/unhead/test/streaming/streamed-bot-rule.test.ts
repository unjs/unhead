import type { HeadValidationRule } from 'unhead/plugins'
import { useHeadSafe, useSeoMeta } from 'unhead'
import { ValidatePlugin } from 'unhead/plugins'
import { createHead } from 'unhead/server'
import { createStreamableHead, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { describe, expect, it, vi } from 'vitest'

function setup(rules?: any) {
  const reported: HeadValidationRule[] = []
  const { head } = createStreamableHead({
    disableDefaults: true,
    plugins: [ValidatePlugin({ onReport: r => reported.push(...r), rules })],
  })
  // the shell has already gone out; everything after this is a patch
  renderShell(head)
  return { head, reported }
}

function flagged(input: any, rules?: any) {
  const { head, reported } = setup(rules)
  head.push(input)
  renderSSRHeadSuspenseChunk(head)
  return reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')
}

describe('streamed-tag-hidden-from-bots', () => {
  it.each([
    ['title', { title: 'Home' }],
    ['base', { base: { href: '/app/' } }],
    ['meta description', { meta: [{ name: 'description', content: 'x' }] }],
    ['meta robots', { meta: [{ name: 'robots', content: 'index' }] }],
    ['meta bingbot', { meta: [{ name: 'bingbot', content: 'index' }] }],
    ['http-equiv refresh', { meta: [{ 'http-equiv': 'refresh', 'content': '0;url=/x' }] }],
    ['og property', { meta: [{ property: 'og:title', content: 'x' }] }],
    ['twitter name', { meta: [{ name: 'twitter:card', content: 'summary' }] }],
    ['link canonical', { link: [{ rel: 'canonical', href: '/' }] }],
    ['link alternate', { link: [{ rel: 'alternate', href: '/fr', hreflang: 'fr' }] }],
    ['link license', { link: [{ rel: 'license', href: '/l' }] }],
    ['ld+json script', { script: [{ type: 'application/ld+json', innerHTML: '{}' }] }],
    ['ld+json script with a profile', { script: [{ type: 'application/ld+json;profile=https://schema.org', innerHTML: '{}' }] }],
  ])('reports %s', (_name, input) => {
    expect(flagged(input)).toHaveLength(1)
  })

  it.each([
    ['preload', { link: [{ rel: 'preload', href: '/a.js', as: 'script' }] }],
    ['stylesheet', { link: [{ rel: 'stylesheet', href: '/a.css' }] }],
    ['icon', { link: [{ rel: 'icon', href: '/f.ico' }] }],
    ['plain script', { script: [{ src: '/app.js' }] }],
    ['different JSON media type', { script: [{ type: 'application/not-ld+json', innerHTML: '{}' }] }],
    ['style', { style: [{ innerHTML: 'body{color:red}' }] }],
    ['htmlAttrs', { htmlAttrs: { lang: 'en' } }],
    ['templateParams', { templateParams: { site: 'Acme' } }],
    ['unrelated meta', { meta: [{ name: 'theme-color', content: '#fff' }] }],
    ['unrelated http-equiv', { meta: [{ 'http-equiv': 'x-ua-compatible', 'content': 'IE=edge' }] }],
  ])('stays quiet for %s', (_name, input) => {
    expect(flagged(input)).toEqual([])
  })

  it('reports the tags useSeoMeta actually renders', () => {
    const { head, reported } = setup()
    useSeoMeta(head as any, { ogTitle: 'x', description: 'y', twitterCard: 'summary' })
    renderSSRHeadSuspenseChunk(head)

    const streamed = reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')
    expect(streamed.map(r => r.message)).toEqual([
      expect.stringContaining('meta[property="og:title"]'),
      expect.stringContaining('meta[name="description"]'),
      expect.stringContaining('meta[name="twitter:card"]'),
    ])
  })

  it('ignores body-positioned tags, except JSON-LD a driver will not serve', () => {
    expect(flagged({ link: [{ rel: 'canonical', href: '/', tagPosition: 'bodyClose' }] })).toEqual([])
    expect(flagged({ script: [{ type: 'application/ld+json', innerHTML: '{}', tagPosition: 'bodyClose' }] })).toHaveLength(1)
  })

  it('stays quiet when the driver writes JSON-LD as streamed body tags', () => {
    const reported: HeadValidationRule[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      writesBodyTags: true,
      plugins: [ValidatePlugin({ onReport: r => reported.push(...r) })],
    })
    renderShell(head)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{}' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')).toEqual([])
  })

  it('matches rel tokens on ASCII whitespace, case-insensitively', () => {
    expect(flagged({ link: [{ rel: 'stylesheet\n\tcanonical' as 'canonical', href: '/' }] })).toHaveLength(1)
    expect(flagged({ meta: [{ property: 'OG:TITLE', content: 'x' }] })).toHaveLength(1)
  })

  it('can be turned off per rule', () => {
    expect(flagged({ title: 'Home' }, { 'streamed-tag-hidden-from-bots': 'off' })).toEqual([])
  })

  it('honours a configured severity', () => {
    const [rule] = flagged({ title: 'Home' }, { 'streamed-tag-hidden-from-bots': 'info' })
    expect(rule!.severity).toBe('info')
  })

  it('says nothing about entries that made the shell', () => {
    const reported: HeadValidationRule[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      plugins: [ValidatePlugin({ onReport: r => reported.push(...r) })],
    })
    head.push({ title: 'Home', link: [{ rel: 'canonical', href: 'https://example.com/' }] })
    renderShell(head)

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')).toEqual([])
  })

  it('exposes streamed tags from a regular server head to framework drivers', () => {
    const chunks: string[][] = []
    const head = createHead({
      disableDefaults: true,
      hooks: { 'ssr:streamChunk': ({ tags }) => { chunks.push(tags.map(tag => tag.tag)) } },
    })
    renderShell(head)
    head.push({ meta: [{ name: 'description', content: 'late' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toContain('description')
    expect(chunks).toEqual([['meta']])
  })

  it('carries the source location of the call that registered the tag', () => {
    const { head, reported } = setup()
    head.push({ link: [{ rel: 'canonical', href: '/' }] })
    renderSSRHeadSuspenseChunk(head)

    // the frame chosen is captureSource's existing heuristic; what matters
    // here is that the entry index survives normalization so a source can be
    // resolved at all
    const [rule] = reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')
    expect(rule!.source).toBeTypeOf('string')
    expect(rule!.source!.length).toBeGreaterThan(0)
  })

  it('stays quiet for a useHeadSafe canonical, which is dropped anyway', () => {
    const { head, reported } = setup()
    useHeadSafe(head as any, { link: [{ rel: 'canonical', href: '/x' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')).toEqual([])
  })

  it('stays quiet for blocked useHeadSafe rel tokens', () => {
    const { head, reported } = setup()
    useHeadSafe(head as any, { link: [{ rel: 'stylesheet\ncanonical', href: '/x' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(reported.filter(r => r.id === 'streamed-tag-hidden-from-bots')).toEqual([])
  })

  it('respects the legacy body prop as a body position', () => {
    expect(flagged({ meta: [{ name: 'description', content: 'x', body: true }] } as any)).toEqual([])
  })

  it('reports the wider Open Graph namespaces', () => {
    expect(flagged({ meta: [{ property: 'video:release_date', content: '2026' }] })).toHaveLength(1)
    expect(flagged({ meta: [{ property: 'product:price:amount', content: '9' }] })).toHaveLength(1)
  })

  it('keeps the resolve rules in the devtools snapshot', () => {
    const { head } = setup()
    const idsAfter = () => ((head as any)._validationRules || []).map((r: any) => r.id)
    expect(idsAfter()).toContain('missing-title')

    head.push({ link: [{ rel: 'canonical', href: '/' }] })
    renderSSRHeadSuspenseChunk(head)
    expect(idsAfter()).toEqual(expect.arrayContaining(['missing-title', 'streamed-tag-hidden-from-bots']))

    // a chunk carrying nothing bot-visible must not wipe the snapshot
    head.push({ script: [{ src: '/a.js' }] })
    renderSSRHeadSuspenseChunk(head)
    expect(idsAfter()).toContain('missing-title')
  })

  it('costs nothing when the plugin is not registered', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    renderShell(head)
    head.push({ title: 'Home' })
    const spy = vi.spyOn(head.hooks!, 'callHook')

    expect(renderSSRHeadSuspenseChunk(head)).toContain('__unhead__.push(')
    expect(spy).not.toHaveBeenCalledWith('ssr:streamChunk', expect.anything())
  })

  it('evaluates a lazy entry once while inspecting its patch', () => {
    const { head } = setup()
    let calls = 0
    head.push((() => ({ title: `Home ${++calls}` })) as any)

    expect(renderSSRHeadSuspenseChunk(head)).toContain('Home 1')
    expect(calls).toBe(1)
  })

  it('drops an entry that fails during inspection', () => {
    const { head } = setup()
    head.push((() => {
      throw new Error('invalid late entry')
    }) as any)
    head.push({ title: 'Valid late entry' })

    expect(() => renderSSRHeadSuspenseChunk(head)).toThrow('invalid late entry')
    expect(renderSSRHeadSuspenseChunk(head)).toContain('Valid late entry')
  })

  it('does not mutate caller-owned script input while inspecting its patch', () => {
    const { head } = setup()
    const script = { innerHTML: { name: 'Acme' } }
    head.push({ script: [script] })

    renderSSRHeadSuspenseChunk(head)

    expect(script).not.toHaveProperty('type')
  })

  it('does not hand out the caller\'s own templateParams object', () => {
    const seen: any[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      hooks: { 'ssr:streamChunk': ({ tags }) => { seen.push(...tags) } },
    })
    renderShell(head)

    // the exact object the caller owns
    const templateParams = { site: 'Acme' }
    head.push({ templateParams })
    renderSSRHeadSuspenseChunk(head)

    expect(seen).toHaveLength(1)
    expect(seen[0]!.props).not.toBe(templateParams)
    seen[0]!.props.site = 'HACKED'
    expect(templateParams.site).toBe('Acme')
  })
})
