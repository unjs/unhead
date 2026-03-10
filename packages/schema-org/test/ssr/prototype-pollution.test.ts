import { defineOrganization, defineWebPage, useSchemaOrg } from '@unhead/schema-org'
import { renderSSRHead } from '@unhead/ssr'
import { describe, expect, it } from 'vitest'
import { useSetup } from '..'

describe('schema.org prototype pollution', () => {
  it('merge strips __proto__ from schema nodes', async () => {
    const ssrHead = await useSetup((head) => {
      useSchemaOrg(head, [
        defineWebPage({
          name: 'test',
          ...JSON.parse('{"__proto__":{"polluted":true}}'),
        }),
      ])
    })

    await renderSSRHead(ssrHead)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('merge strips constructor from schema nodes', async () => {
    const ssrHead = await useSetup((head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'Test Org',
          constructor: { prototype: { polluted: true } },
        } as any),
      ])
    })

    await renderSSRHead(ssrHead)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('merge strips prototype from schema nodes', async () => {
    const ssrHead = await useSetup((head) => {
      useSchemaOrg(head, [
        defineWebPage({
          name: 'test',
          prototype: { polluted: true },
        } as any),
      ])
    })

    await renderSSRHead(ssrHead)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('preserves valid schema data while stripping dangerous keys', async () => {
    const ssrHead = await useSetup((head) => {
      useSchemaOrg(head, [
        defineWebPage({
          name: 'My Page',
          description: 'A safe description',
          ...JSON.parse('{"__proto__":{"polluted":true}}'),
        }),
      ])
    })

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toContain('"name": "My Page"')
    expect(data.bodyTags).toContain('"description": "A safe description"')
    expect(data.bodyTags).not.toContain('__proto__')
    expect(data.bodyTags).not.toContain('polluted')
    expect(({} as any).polluted).toBeUndefined()
  })

  it('handles __proto__ in deeply nested objects', async () => {
    const ssrHead = await useSetup((head) => {
      useSchemaOrg(head, [
        defineOrganization({
          name: 'Test Org',
          address: JSON.parse('{"streetAddress":"123 Main St","__proto__":{"polluted":true}}'),
        } as any),
      ])
    })

    await renderSSRHead(ssrHead)
    expect(({} as any).polluted).toBeUndefined()
  })
})
