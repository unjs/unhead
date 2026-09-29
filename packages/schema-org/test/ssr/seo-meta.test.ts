import { defineArticle, defineWebPage, useSchemaOrg } from '@unhead/schema-org'
import { useHead, useSeoMeta } from 'unhead'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

async function renderGraph(head: any) {
  const { bodyTags } = await renderSSRHead(head)
  const json = bodyTags.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/)![1]
  return JSON.parse(json)['@graph'] as Record<string, any>[]
}

function node(graph: Record<string, any>[], type: string) {
  return graph.find(n => n['@type'] === type || (Array.isArray(n['@type']) && n['@type'].includes(type)))!
}

describe('schema.org meta from useSeoMeta', () => {
  it('reads description and ogImage when useSeoMeta runs after useSchemaOrg', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/post' } } })
    useSchemaOrg(head, [defineWebPage(), defineArticle({ headline: 'Post' })])
    useSeoMeta(head, {
      description: 'Page description',
      ogImage: 'https://example.com/og.png',
    })

    const graph = await renderGraph(head)
    expect(node(graph, 'WebPage').description).toBe('Page description')
    expect(node(graph, 'Article').description).toBe('Page description')
    expect(node(graph, 'Article').thumbnailUrl).toBe('https://example.com/og.png')
  })

  it('reads description and ogImage when useSeoMeta runs before useSchemaOrg', async () => {
    const head = createHead()
    useHead(head, { templateParams: { schemaOrg: { host: 'https://example.com', path: '/post' } } })
    useSeoMeta(head, {
      description: 'Page description',
      ogImage: { url: 'https://example.com/og.png', width: 1200 },
    })
    useSchemaOrg(head, [defineWebPage(), defineArticle({ headline: 'Post' })])

    const graph = await renderGraph(head)
    expect(node(graph, 'WebPage').description).toBe('Page description')
    expect(node(graph, 'Article').thumbnailUrl).toBe('https://example.com/og.png')
  })

  it('page useSeoMeta description beats the site description', async () => {
    const head = createHead()
    useHead(head, {
      templateParams: {
        schemaOrg: { host: 'https://example.com', path: '/post', description: 'Site description' },
      },
    })
    useSchemaOrg(head, [defineWebPage()])
    useSeoMeta(head, { description: 'Page description' })

    expect(node(await renderGraph(head), 'WebPage').description).toBe('Page description')
  })
})
