import { defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org'
import { createHead, renderSSRHead } from '@unhead/ssr'
import { useHead } from 'unhead'
import { describe, expect, it } from 'vitest'

function findNode(bodyTags: string, type: string) {
  const json = bodyTags.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/)![1]
  return (JSON.parse(json)['@graph'] as Record<string, any>[]).find(n => n['@type'] === type)!
}

function webPage(bodyTags: string) {
  return findNode(bodyTags, 'WebPage')
}

describe('schema.org canonical link', () => {
  it('canonical link sets the WebPage url over host and path', () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/blog/post?utm=x' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/blog/post' }] })

    const page = webPage(renderSSRHead(head).bodyTags)
    expect(page.url).toBe('https://example.com/blog/post')
    expect(page['@id']).toBe('https://example.com/blog/post#webpage')
  })

  it('canonical link wins when template params come later', () => {
    const head = createHead()
    useHead(head, { link: [{ rel: 'canonical', href: 'https://canonical.example.com/page' }] })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/other' } } })

    const page = webPage(renderSSRHead(head).bodyTags)
    expect(page.url).toBe('https://canonical.example.com/page')
    expect(page['@id']).toBe('https://canonical.example.com/page#webpage')
  })

  it('relative canonical link sets the path', () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/other' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: '/page' }] })

    expect(webPage(renderSSRHead(head).bodyTags).url).toBe('https://example.com/page')
  })

  it('canonical link template params resolve before use', () => {
    const head = createHead()
    useHead(head, { templateParams: { siteUrl: 'https://example.com', schemaOrg: { host: 'https://example.com', path: '/other' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: '%siteUrl/page' }] })

    expect(webPage(renderSSRHead(head).bodyTags).url).toBe('https://example.com/page')
  })
  it('explicit url in template params beats the canonical link', () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/other', url: 'https://override.example.com/custom' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/page' }] })

    const page = webPage(renderSSRHead(head).bodyTags)
    expect(page.url).toBe('https://override.example.com/custom')
    expect(page['@id']).toBe('https://override.example.com/custom#webpage')
  })

  it('url under a host with a trailing slash or base path keeps that host', () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com/base/', path: '/other' } } })
    useSchemaOrg(head, [defineWebSite({ name: 'Site' }), defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/base/page' }] })

    const bodyTags = renderSSRHead(head).bodyTags
    expect(webPage(bodyTags).url).toBe('https://example.com/base/page')
    expect(findNode(bodyTags, 'WebSite')['@id']).toBe('https://example.com/base/#website')
  })

  it('explicit url equal to the host keeps the host trailing slash', () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com/', path: '/', url: 'https://example.com/' } } })
    useSchemaOrg(head, [defineWebSite({ name: 'Site' }), defineWebPage()])

    const bodyTags = renderSSRHead(head).bodyTags
    expect(webPage(bodyTags)['@id']).toBe('https://example.com/#webpage')
    expect(findNode(bodyTags, 'WebSite')['@id']).toBe('https://example.com/#website')
  })
})
