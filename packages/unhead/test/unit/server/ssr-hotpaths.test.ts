import { describe, expect, it } from 'vitest'
import { FlatMetaPlugin, TemplateParamsPlugin } from '../../../src/plugins'
import { ValidatePlugin } from '../../../src/plugins/validate'
import { createHead, renderSSRHead } from '../../../src/server'
import { normalizeEntryToTags, unpackMeta, walkResolver } from '../../../src/utils'

describe('ssr resolve hotpaths', () => {
  it('does not mutate caller templateParams input across repeated SSR renders', () => {
    const templateParams = { siteName: 'Site', separator: '·' }
    const shared = { titleTemplate: '%s %separator %siteName', templateParams }

    const first = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    first.push(shared)
    first.push({ title: 'Home' })
    expect(renderSSRHead(first).headTags).toBe('<title>Home · Site</title>')
    expect(templateParams).toEqual({ siteName: 'Site', separator: '·' })

    const second = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    second.push(shared)
    second.push({ title: 'Tools' })
    expect(renderSSRHead(second).headTags).toBe('<title>Tools · Site</title>')
  })

  it('isolates repeated SSR renders when tags:resolve mutates tags in place', () => {
    let calls = 0
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          calls++
          for (const tag of tags) {
            if (tag.tag === 'meta' && tag.props.name === 'description')
              tag.props.content = `${tag.props.content}-${calls}`
          }
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'base' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="base-1">')
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="base-2">')
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="base-3">')
    // Repeated renders on the same SSR head reuse cached normalized tags while staying isolated.
    expect(head.entries.get(1)?._tags).toBeDefined()
  })

  it('defensively clones tags when entries:normalize adds a tags:resolve hook mid-render', () => {
    let registered = false
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'entries:normalize': () => {
          if (registered)
            return
          registered = true
          head.hooks.hook('tags:resolve', ({ tags }) => {
            for (const tag of tags) {
              if (tag.tag === 'meta' && tag.props.name === 'description')
                tag.props.content = `${tag.props.content}!`
            }
          })
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'orig' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="orig!">')
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="orig!">')
  })

  it('skips primitive resolver calls for _static resolvers while preserving non-static primitive transforms', () => {
    const staticCalls: unknown[] = []
    const staticResolver = Object.assign((_?: string, v?: any) => {
      staticCalls.push(v)
      return v
    }, { _static: true })

    const walked = walkResolver({ title: 'Hello', count: 42, flag: true, nested: [{ a: 'b' }] }, staticResolver)
    expect(walked).toEqual({ title: 'Hello', count: 42, flag: true, nested: [{ a: 'b' }] })
    // Only objects/arrays were passed to the _static resolver, not primitive leaves.
    expect(staticCalls.every(v => typeof v === 'object' && v !== null)).toBe(true)

    const upperResolver = (_?: string, v?: any) => typeof v === 'string' ? v.toUpperCase() : v
    const tags = normalizeEntryToTags({ title: 'hello', meta: [{ name: 'description', content: 'world' }] }, [upperResolver])
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe('HELLO')
    expect(tags.find(t => t.tag === 'meta')?.props.content).toBe('WORLD')
  })

  it('leaves entries without _flatMeta untouched in FlatMetaPlugin', () => {
    const head = createHead({ disableDefaults: true, plugins: [FlatMetaPlugin] })
    head.push({ title: 'Plain', meta: [{ name: 'description', content: 'desc' }] })
    const res = renderSSRHead(head)
    expect(res.headTags).toContain('<title>Plain</title>')
    expect(res.headTags).toContain('<meta name="description" content="desc">')
  })

  it('preserves numeric titles when TemplateParamsPlugin is active', () => {
    const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    head.push({ title: 42 as any })
    expect(renderSSRHead(head).headTags).toBe('<title>42</title>')
  })

  it('keeps ValidatePlugin observing invalid primitive top-level shapes', () => {
    const reported: string[] = []
    const head = createHead({
      disableDefaults: true,
      plugins: [ValidatePlugin({ onReport: rules => reported.push(...rules.map(r => r.id)) })],
    })
    head.push({ meta: 'bad' as any })
    renderSSRHead(head)
    expect(reported).toContain('invalid-input-shape')
  })

  it('skips inherited keys introduced via __proto__ in unpackMeta', () => {
    const malicious = JSON.parse('{"__proto__":{"description":"wrong"},"title":"ok"}')
    const tags = unpackMeta(malicious)
    expect(tags.some(t => t.name === 'description')).toBe(false)
  })

  it('isolates class and style containers across array-valued content tags on SSR', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.props.content === '/a') {
              ;(tag.props.class as unknown as Set<string>).add('only-a')
              ;(tag.props.style as unknown as Map<string, string>).set('display', 'block')
            }
          }
        },
      },
    })
    head.push({
      meta: [{ property: 'og:image', content: ['/a', '/b'] as any, class: 'base', style: 'color:red' } as any],
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('content="/a" class="base only-a" style="color:red;display:block"')
    expect(headTags).toContain('content="/b" class="base" style="color:red"')
  })

  it('clones tags injected into ctx.tags by entries:resolve before mutating hooks run', () => {
    const injected = { tag: 'meta' as const, props: { name: 'description', content: 'base' }, _w: 100, _p: 1, _d: 'meta:description' }
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'entries:resolve': ({ tags }) => {
          tags.push(injected)
        },
        'tags:resolve': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'meta' && tag.props.name === 'description')
              tag.props.content = `${tag.props.content}!`
          }
        },
      },
    })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="base!">')
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="base!">')
    expect(injected.props.content).toBe('base')
  })
})
