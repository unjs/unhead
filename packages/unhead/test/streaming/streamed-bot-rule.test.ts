import type { HeadValidationRule } from 'unhead/plugins'
import { useSeoMeta } from 'unhead'
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

  it('ignores body-positioned tags, except JSON-LD which bots read anywhere', () => {
    expect(flagged({ link: [{ rel: 'canonical', href: '/', tagPosition: 'bodyClose' }] })).toEqual([])
    expect(flagged({ script: [{ type: 'application/ld+json', innerHTML: '{}', tagPosition: 'bodyClose' }] })).toHaveLength(1)
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

  it('costs nothing when the plugin is not registered', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    renderShell(head)
    head.push({ title: 'Home' })
    const spy = vi.spyOn(head.hooks!, 'callHook')

    expect(renderSSRHeadSuspenseChunk(head)).toContain('__unhead__.push(')
    expect(spy).not.toHaveBeenCalledWith('ssr:streamChunk', expect.anything())
  })

  it('does not let a mutated templateParams tag reach a later render', () => {
    const seen: any[] = []
    const { head } = createStreamableHead({
      disableDefaults: true,
      hooks: { 'ssr:streamChunk': ({ tags }) => { seen.push(...tags) } },
    })
    renderShell(head)
    head.push({ templateParams: { site: 'Acme' } })
    renderSSRHeadSuspenseChunk(head)
    seen[0]!.props.site = 'HACKED'

    head.push({ templateParams: { other: 'x' } })
    expect(renderSSRHeadSuspenseChunk(head)).not.toContain('HACKED')
  })
})
