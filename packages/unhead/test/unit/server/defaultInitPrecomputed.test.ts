import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('default init precomputed tags', () => {
  it('attaches precomputed tags to the default init entry only', () => {
    const head = createHead()
    head.push({ title: 'test' })
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
    expect(head.entries.get(2)?._precomputedTags).toBeUndefined()
  })

  it('two sequential createHead() renders produce identical output', () => {
    const render = () => {
      const head = createHead()
      head.push({
        title: 'test',
        meta: [{ name: 'description', content: 'hello' }],
      })
      return renderSSRHead(head)
    }
    const first = render()
    const second = render()
    expect(second).toEqual(first)
    expect(first).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>test</title>
      <meta name="description" content="hello">",
        "htmlAttrs": " lang="en"",
      }
    `)
  })

  it('output matches the non-precomputed normalize path exactly', () => {
    const fast = createHead()
    const slow = createHead()
    // force the slow path for one head
    delete slow.entries.get(1)!._precomputedTags
    for (const head of [fast, slow]) {
      head.push({
        htmlAttrs: { lang: 'de' },
        meta: [{ name: 'og:title', content: 'test' }],
      })
    }
    expect(renderSSRHead(fast)).toEqual(renderSSRHead(slow))
  })

  it('fast path does not cache the shared array on the entry', () => {
    const head = createHead()
    renderSSRHead(head)
    // the shared precomputed array must never be reachable via _tags
    expect(head.entries.get(1)!._tags).toBeUndefined()
  })

  it('pending updates discard precomputed tags', () => {
    const head = createHead()
    const entry = head.entries.get(1)!
    entry._pending = { htmlAttrs: { lang: 'fr' } }

    expect(renderSSRHead(head).htmlAttrs).toBe(' lang="fr"')
    expect(entry._precomputedTags).toBeUndefined()
  })

  it('entries:normalize hook registered before first render still sees the default entry tags', () => {
    const head = createHead()
    const seen: string[] = []
    head.hooks.hook('entries:normalize', (ctx) => {
      for (const tag of ctx.tags) {
        seen.push(tag.tag)
        if (tag.tag === 'htmlAttrs')
          tag.props.lang = 'fr'
      }
    })
    const res = renderSSRHead(head)
    expect(seen).toContain('htmlAttrs')
    expect(seen).toContain('meta')
    expect(res.htmlAttrs).toBe(' lang="fr"')
    // the hook mutated freshly normalized tags, not the shared array
    const fresh = createHead()
    expect(renderSSRHead(fresh).htmlAttrs).toBe(' lang="en"')
  })

  it('entries:resolve hook forces the normalize path so the shared array is never exposed', () => {
    const head = createHead()
    head.hooks.hook('entries:resolve', () => {})
    renderSSRHead(head)
    const entry = head.entries.get(1)!
    expect(entry._tags).toBeDefined()
    expect(entry._tags).not.toBe(entry._precomputedTags)
  })

  it('tag mutating hooks cannot contaminate the shared array across heads', () => {
    const head = createHead()
    head.hooks.hook('tags:resolve', (ctx) => {
      for (const tag of ctx.tags) {
        if (tag.tag === 'meta' && tag.props.name === 'viewport')
          tag.props.content = 'mutated'
      }
    })
    expect(renderSSRHead(head).headTags).toContain('content="mutated"')
    const fresh = createHead()
    expect(renderSSRHead(fresh).headTags).toContain('content="width=device-width, initial-scale=1"')
  })

  it('custom tagWeight bypasses the fast path', () => {
    const head = createHead({ tagWeight: () => 1 })
    expect(head.entries.get(1)?._precomputedTags).toBeUndefined()
    renderSSRHead(head)
    expect(head.entries.get(1)!._tags).toBeDefined()
  })

  it('unmarked custom propResolvers bypass the fast path', () => {
    const head = createHead({ propResolvers: [(_, v) => v] })
    expect(head.entries.get(1)?._precomputedTags).toBeUndefined()
  })

  it('propResolvers marked _static keep the fast path', () => {
    const staticResolver = Object.assign((_?: string, v?: any) => v, { _static: true })
    const head = createHead({ propResolvers: [staticResolver] })
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
    // any unmarked resolver in the chain disables it
    const mixed = createHead({ propResolvers: [staticResolver, (_, v) => v] })
    expect(mixed.entries.get(1)?._precomputedTags).toBeUndefined()
  })

  it('disableDefaults renders no default tags', () => {
    const head = createHead({ disableDefaults: true })
    expect(head.entries.size).toBe(0)
    expect(renderSSRHead(head).headTags).toBe('')
  })

  it('user init entries keep the normalize path', () => {
    const head = createHead({ init: [{ meta: [{ name: 'author', content: 'me' }] }] })
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
    expect(head.entries.get(2)?._precomputedTags).toBeUndefined()
    expect(renderSSRHead(head).headTags).toContain('name="author"')
  })
})
