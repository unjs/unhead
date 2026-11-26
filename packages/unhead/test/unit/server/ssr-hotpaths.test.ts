import { describe, expect, it } from 'vitest'
import { FlatMetaPlugin, TemplateParamsPlugin } from '../../../src/plugins'
import { createHead, renderSSRHead } from '../../../src/server'
import { normalizeEntryToTags, walkResolver } from '../../../src/utils'

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
})
