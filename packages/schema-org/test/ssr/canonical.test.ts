import { defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

function findNode(bodyTags: string, type: string) {
  const json = bodyTags.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/)![1]
  return (JSON.parse(json)['@graph'] as Record<string, any>[]).find(n => n['@type'] === type)!
}

function webPage(bodyTags: string) {
  return findNode(bodyTags, 'WebPage')
}

describe('schema.org canonical link', async () => {
  it('canonical link sets the WebPage url over host and path', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/blog/post?utm=x' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/blog/post' }] })

    const page = webPage((await renderSSRHead(head)).bodyTags)
    expect(page.url).toBe('https://example.com/blog/post')
    expect(page['@id']).toBe('https://example.com/blog/post#webpage')
  })

  it('canonical link wins when template params come later', async () => {
    const head = createHead()
    useHead(head, { link: [{ rel: 'canonical', href: 'https://canonical.example.com/page' }] })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/other' } } })

    const page = webPage((await renderSSRHead(head)).bodyTags)
    expect(page.url).toBe('https://canonical.example.com/page')
    expect(page['@id']).toBe('https://example.com/other#webpage')
  })

  it('relative canonical link sets the path', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/other' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: '/page' }] })

    expect(webPage((await renderSSRHead(head)).bodyTags).url).toBe('https://example.com/page')
  })

  it('canonical link template params resolve before use', async () => {
    const head = createHead()
    useHead(head, { templateParams: { siteUrl: 'https://example.com', schemaOrg: { host: 'https://example.com', path: '/other' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: '%siteUrl/page' }] })

    expect(webPage((await renderSSRHead(head)).bodyTags).url).toBe('https://example.com/page')
  })

  it('explicit url in template params beats the canonical link', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/other', url: 'https://override.example.com/custom' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/page' }] })

    const page = webPage((await renderSSRHead(head)).bodyTags)
    expect(page.url).toBe('https://override.example.com/custom')
    expect(page['@id']).toBe('https://example.com/other#webpage')
  })

  it('url under a host with a trailing slash or base path keeps that host', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com/base/', path: '/other' } } })
    useSchemaOrg(head, [defineWebSite({ name: 'Site' }), defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://EXAMPLE.com:443/base/page' }] })

    const bodyTags = (await renderSSRHead(head)).bodyTags
    expect(webPage(bodyTags).url).toBe('https://EXAMPLE.com:443/base/page')
    expect(findNode(bodyTags, 'WebSite')['@id']).toBe('https://example.com/base/#website')
  })

  it('explicit url equal to the host keeps the host trailing slash', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com/', path: '/', url: 'https://example.com/' } } })
    useSchemaOrg(head, [defineWebSite({ name: 'Site' }), defineWebPage()])

    const bodyTags = (await renderSSRHead(head)).bodyTags
    expect(webPage(bodyTags)['@id']).toBe('https://example.com/#webpage')
    expect(findNode(bodyTags, 'WebSite')['@id']).toBe('https://example.com/#website')
  })

  it('cross-domain canonical sets the url but keeps @id on the site host', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/post' } } })
    useSchemaOrg(head, [defineWebSite({ name: 'Site' }), defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://syndicated.example.org/original' }] })

    const bodyTags = (await renderSSRHead(head)).bodyTags
    expect(webPage(bodyTags).url).toBe('https://syndicated.example.org/original')
    expect(webPage(bodyTags)['@id']).toBe('https://example.com/post#webpage')
    expect(findNode(bodyTags, 'WebSite')['@id']).toBe('https://example.com#website')
  })

  it('canonical query string stays in the url and the @id', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/blog' } } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/blog?page=2' }] })

    const page = webPage((await renderSSRHead(head)).bodyTags)
    expect(page.url).toBe('https://example.com/blog?page=2')
    expect(page['@id']).toBe('https://example.com/blog?page=2#webpage')
  })

  it('canonical is used as given, whatever trailingSlash says', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/blog', trailingSlash: false } as unknown as Record<string, string> } })
    useSchemaOrg(head, [defineWebPage()])
    useHead(head, { link: [{ rel: 'canonical', href: 'https://example.com/blog/' }] })

    const page = webPage((await renderSSRHead(head)).bodyTags)
    expect(page.url).toBe('https://example.com/blog/')
    expect(page['@id']).toBe('https://example.com/blog/#webpage')
  })

  it('trailingSlash still normalizes a url built from host and path', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/blog/', trailingSlash: false } as unknown as Record<string, string> } })
    useSchemaOrg(head, [defineWebPage()])

    expect(webPage((await renderSSRHead(head)).bodyTags).url).toBe('https://example.com/blog')
  })
})
