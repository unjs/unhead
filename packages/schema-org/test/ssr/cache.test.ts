import { defineSchemaOrgResolver, defineWebPage, defineWebSite, UnheadSchemaOrg } from '@unhead/schema-org'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

describe('schema.org render cache', () => {
  it('isolates one plugin instance across nested head renders', () => {
    const plugin = UnheadSchemaOrg({ host: 'https://example.com' })
    const first = createHead({ disableDefaults: true })
    const second = createHead({ disableDefaults: true })
    first.use(plugin)
    second.use(plugin)
    first.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebSite({ name: 'First' })] }],
    } as any)
    second.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebPage({ name: 'Second' })] }],
    } as any)
    first.hooks.hook('entries:resolve', () => renderSSRHead(second))

    const result = renderSSRHead(first).bodyTags
    expect(result).toContain('First')
    expect(result).not.toContain('Second')
  })

  it('invalidates when entries change', () => {
    const head = createHead({ disableDefaults: true })
    head.use(UnheadSchemaOrg({ host: 'https://example.com' }))
    const entry = head.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebSite({ name: 'First' })] }],
    } as any)

    expect(renderSSRHead(head).bodyTags).toContain('First')
    expect(renderSSRHead(head).bodyTags).toContain('First')

    entry.patch({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebSite({ name: 'Second' })] }],
    } as any)
    expect(renderSSRHead(head).bodyTags).toContain('Second')

    entry.dispose()
    expect(renderSSRHead(head).bodyTags).toBe('')
  })

  it('does not cache dynamic metadata callbacks', () => {
    let host = 'https://first.example.com'
    const head = createHead({ disableDefaults: true })
    head.use(UnheadSchemaOrg({}, () => ({ host })))
    head.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebPage({ name: 'Page' })] }],
    } as any)

    expect(renderSSRHead(head).bodyTags).toContain('https://first.example.com')
    host = 'https://second.example.com'
    expect(renderSSRHead(head).bodyTags).toContain('https://second.example.com')
  })

  it('does not cache custom resolvers', () => {
    let renders = 0
    const resolver = defineSchemaOrgResolver({
      defaults: { '@type': 'Thing' },
      resolve(node: any) {
        node.name = String(++renders)
        return node
      },
    })
    const head = createHead({ disableDefaults: true })
    head.use(UnheadSchemaOrg({ host: 'https://example.com' }))
    head.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [{ _resolver: resolver }] }],
    } as any)

    expect(renderSSRHead(head).bodyTags).toContain('"name": "1"')
    expect(renderSSRHead(head).bodyTags).toContain('"name": "2"')
  })

  it('invalidates when a schema node changes in place', () => {
    const site = defineWebSite({ name: 'First' })
    const head = createHead({ disableDefaults: true })
    head.use(UnheadSchemaOrg({ host: 'https://example.com' }))
    head.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [site] }],
    } as any)

    expect(renderSSRHead(head).bodyTags).toContain('First')
    site.name = 'Second'
    expect(renderSSRHead(head).bodyTags).toContain('Second')
  })

  it('invalidates when a schema node array changes in place', () => {
    const input: any = {
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebSite({ name: 'First' })] }],
    }
    const head = createHead({ disableDefaults: true })
    head.use(UnheadSchemaOrg({ host: 'https://example.com' }))
    head.push(input)

    expect(renderSSRHead(head).bodyTags).toContain('First')
    input.script[0].nodes = [defineWebSite({ name: 'Second' })]
    expect(renderSSRHead(head).bodyTags).toContain('Second')
  })

  it('does not cache output from custom tag hooks', () => {
    let name = 'First'
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'entries:normalize': ({ tags }) => {
          for (const tag of tags) {
            if (tag.props.nodes) {
              ;(tag.props as any).nodes = [defineWebSite({ name })]
            }
          }
        },
      },
    })
    head.use(UnheadSchemaOrg({ host: 'https://example.com' }))
    head.push({
      script: [{ type: 'application/ld+json', key: 'schema-org-graph', nodes: [defineWebSite()] }],
    } as any)

    expect(renderSSRHead(head).bodyTags).toContain('First')
    name = 'Second'
    expect(renderSSRHead(head).bodyTags).toContain('Second')
  })
})
