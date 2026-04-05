import { defineWebPage, defineWebSite, UnheadSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

describe('schema.org graph cleanup on dispose', () => {
  it('removes stale nodes after entry disposal', async () => {
    const ssrHead = createHead()
    ssrHead.use(UnheadSchemaOrg({ host: 'https://example.com' }))

    const entry = useHead(ssrHead, {
      script: [
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            defineWebPage({
              name: 'Test Page',
              image: 'https://example.com/image.jpg',
            }),
          ],
        } as any,
      ],
    })

    // Before dispose: should contain the WebPage with image
    let data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toContain('Test Page')
    expect(data.bodyTags).toContain('image.jpg')

    // Dispose the entry (simulates component unmount)
    entry.dispose()

    // After dispose: the graph should be empty, no stale nodes
    data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).not.toContain('Test Page')
    expect(data.bodyTags).not.toContain('image.jpg')
  })

  it('keeps active nodes after another entry is disposed', async () => {
    const ssrHead = createHead()
    ssrHead.use(UnheadSchemaOrg({ host: 'https://example.com' }))

    // Entry A: a WebSite (persists)
    useHead(ssrHead, {
      script: [
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            defineWebSite({
              name: 'Persistent Site',
            }),
          ],
        } as any,
      ],
    })

    // Entry B: a WebPage (will be disposed)
    const entryB = useHead(ssrHead, {
      script: [
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            defineWebPage({
              name: 'Temporary Page',
            }),
          ],
        } as any,
      ],
    })

    // Both present before dispose
    let data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toContain('Persistent Site')
    expect(data.bodyTags).toContain('Temporary Page')

    // Dispose entry B
    entryB.dispose()

    // After dispose: only entry A should remain
    data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toContain('Persistent Site')
    expect(data.bodyTags).not.toContain('Temporary Page')
  })
})
