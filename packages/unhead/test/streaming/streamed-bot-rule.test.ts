import type { HeadValidationRule } from 'unhead/plugins'
import { useHeadSafe, useSeoMeta } from 'unhead'
import { ValidatePlugin } from 'unhead/plugins'
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
  ])('reports %s', (_name, input) => {
    expect(flagged(input)).toHaveLength(1)
  })

  it.each([
    ['preload', { link: [{ rel: 'preload', href: '/a.js', as: 'script' }] }],
    ['stylesheet', { link: [{ rel: 'stylesheet', href: '/a.css' }] }],
    ['icon', { link: [{ rel: 'icon', href: '/f.ico' }] }],
    ['plain script', { script: [{ src: '/app.js' }] }],
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

  it('stays quiet when the driver writes JSON-LD as Streamed Body Tags', () => {
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

  it('matches rel tokens on any whitespace, case-insensitively', () => {
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

  it('does not hand out the callers own templateParams object', () => {
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
