import type { HeadHooks, HeadPlugin, HeadTag } from 'unhead/types'
import { JSDOM } from 'jsdom'
import { createHead as createClientHead, renderDOMHead } from 'unhead/client'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { capoTagWeight, createHead, renderSSRHead } from 'unhead/server'
import { dedupeKey, hashTag, sanitizeTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'

describe('public tag boundaries', () => {
  const legacy: HeadTag = Object.freeze({ tag: 'link', props: Object.freeze({ rel: 'canonical', href: '/legacy' }) })

  it('derives a canonical key from a props-only link', () => {
    expect(dedupeKey(legacy)).toBe('canonical')
  })

  it('hashes a props-only link in stable attribute order', () => {
    expect(hashTag(legacy)).toBe('link:href:/legacy,rel:canonical')
  })

  it('weighs a props-only canonical link', () => {
    expect(capoTagWeight(legacy)).toBe(100)
  })

  it('retains a props-only canonical link during sanitization', () => {
    const tags = sanitizeTags([legacy])
    expect(tags.map(tag => tag.attrs)).toEqual([legacy.props])
    expect(legacy.attrs).toBeUndefined()
  })

  it('prefers attrs over conflicting props at helper boundaries', () => {
    const tag = { ...legacy, attrs: { rel: 'stylesheet', href: '/canonical.css' } }
    expect(dedupeKey(tag)).toBe('link:stylesheet:/canonical.css')
    expect(hashTag(tag)).toBe('link:href:/canonical.css,rel:stylesheet')
    expect(capoTagWeight(tag)).toBe(60)
    expect(sanitizeTags([tag])[0].attrs).toEqual(tag.attrs)
  })

  it('accepts legacy factory tags through map.set and concat before template listeners', () => {
    const makeParams = (): HeadTag => ({ tag: 'templateParams', props: { siteName: 'Legacy site' } })
    const makeLink = (): HeadTag => ({ tag: 'link', props: { ...legacy.props } })
    const plugin: HeadPlugin = {
      key: 'legacy-collections',
      hooks: {
        'tags:resolve': (ctx: Parameters<HeadHooks['tags:resolve']>[0]) => {
          ctx.tagMap.set('templateParams', makeParams())
          ctx.tags = ctx.tags.concat(makeLink(), [makeLink()])
        },
      },
    }
    const head = createHead({ disableDefaults: true, plugins: [plugin, TemplateParamsPlugin] })
    head.push({ title: '%siteName' })

    const html = renderSSRHead(head).headTags
    expect(html).toContain('<title>Legacy site</title>')
    expect(html.match(/<link rel="canonical" href="\/legacy">/g)).toHaveLength(2)
  })

  it('renders distinct attrs-only hook links and cleans up only the removed link', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    const document = dom.window.document
    let hrefs = ['/first.css', '/second.css']
    const head = createClientHead({ document })
    head.hooks.hook('tags:resolve', ({ tags }) => {
      tags.push(...hrefs.map(href => ({ tag: 'link' as const, attrs: { rel: 'stylesheet', href } })))
    })
    const entry = head.push({ title: 'first' })
    renderDOMHead(head)
    const links = () => [...document.head.querySelectorAll('link')].map(link => link.getAttribute('href'))
    expect(links()).toEqual(hrefs)
    const survivor = document.head.querySelector('link[href="/second.css"]')

    hrefs = ['/second.css']
    entry.patch({ title: 'second' })
    renderDOMHead(head)
    expect(links()).toEqual(hrefs)
    expect(document.head.querySelector('link')).toBe(survivor)
    dom.window.close()
  })
})
