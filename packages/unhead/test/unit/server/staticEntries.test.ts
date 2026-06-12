import type { ResolvableHead, StaticEntryStore } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { createHead } from '../../../src/server'
import { resolveTags } from '../../../src/utils'

describe('static entry sharing', () => {
  it('shared input renders identically to per-request input', () => {
    const staticCache: StaticEntryStore = {}
    const shared: ResolvableHead = {
      title: 'My Site',
      meta: [
        { name: 'description', content: 'hello' },
        { property: 'og:image', content: '/a.png' },
      ],
      link: [{ rel: 'stylesheet', href: '/app.css' }],
    }
    const plain = createHead()
    plain.push(structuredClone(shared) as any)
    const expected = plain.render()
    for (let i = 0; i < 3; i++) {
      const h = createHead({ staticCache, init: [shared] })
      expect(h.render()).toStrictEqual(expected)
    }
  })

  it('same pure init input across heads is promoted and tags are shared', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'shared' }] }
    const heads = Array.from({ length: 3 }, () => createHead({ staticCache, disableDefaults: true, init: [input] }))
    const [ta, tb, tc] = heads.map(h => resolveTags(h))
    expect(ta[0].props.content).toBe('shared')
    // promotion happens on the second head; from then on tags are shared
    expect(tc[0]).toBe(tb[0])
    expect(Object.isFrozen(tc[0])).toBe(true)
    expect(Object.isFrozen(tc[0].props)).toBe(true)
  })

  it('the default server init is shared across heads using the same store', () => {
    const staticCache: StaticEntryStore = {}
    resolveTags(createHead({ staticCache })) // first sighting
    const a = createHead({ staticCache })
    const b = createHead({ staticCache })
    const ca = resolveTags(a).find(t => t.props.charset)
    const cb = resolveTags(b).find(t => t.props.charset)
    expect(ca).toBeDefined()
    expect(ca).toBe(cb)
  })

  it('without a store nothing is shared and output is unchanged', () => {
    const a = createHead()
    const b = createHead()
    const ca = resolveTags(a).find(t => t.props.charset)
    const cb = resolveTags(b).find(t => t.props.charset)
    expect(ca).not.toBe(cb)
    expect(a.render()).toStrictEqual(b.render())
  })

  it('the static entry option promotes on first use', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'eager' }] }
    const a = createHead({ staticCache, disableDefaults: true })
    a.push(input as any, { static: true })
    const ta = resolveTags(a)
    const b = createHead({ staticCache, disableDefaults: true })
    b.push(input as any, { static: true })
    expect(resolveTags(b)[0]).toBe(ta[0])
  })

  it('inputs with functions are never promoted', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = { title: () => 'dynamic' }
    const tags = Array.from({ length: 3 }, () => {
      const h = createHead({ staticCache, disableDefaults: true, init: [input] })
      return resolveTags(h)[0]
    })
    expect(tags[0].textContent).toBe('dynamic')
    expect(tags[1]).not.toBe(tags[2])
  })

  it('titleTemplate functions stay live on promoted inputs', () => {
    const staticCache: StaticEntryStore = {}
    let suffix = 'A'
    const input: ResolvableHead = {
      title: 'Page',
      titleTemplate: (t?: string) => `${t} - ${suffix}`,
    }
    const a = createHead({ staticCache, disableDefaults: true, init: [input] })
    expect(a.render().headTags).toContain('Page - A')
    const b = createHead({ staticCache, disableDefaults: true, init: [input] })
    suffix = 'B'
    expect(b.render().headTags).toContain('Page - B')
    // promoted by now; the template function is still called per render
    const c = createHead({ staticCache, disableDefaults: true, init: [input] })
    suffix = 'C'
    expect(c.render().headTags).toContain('Page - C')
  })

  it('patching with the same identity disqualifies and invalidates the input', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'v1' }] }
    const a = createHead({ staticCache, disableDefaults: true })
    const entry = a.push(input as any, { static: true })
    const promoted = resolveTags(a)
    // patch with the same object (custom-integration style)
    entry.patch(input as any)
    // a new head re-normalizes rather than reading a stale cache
    const b = createHead({ staticCache, disableDefaults: true })
    b.push(input as any, { static: true })
    expect(resolveTags(b)[0]).not.toBe(promoted[0])
  })

  it('regular entries still override promoted static tags', () => {
    const staticCache: StaticEntryStore = {}
    resolveTags(createHead({ staticCache }))
    resolveTags(createHead({ staticCache }))
    const head = createHead({ staticCache })
    head.push({ meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }] })
    const { headTags } = head.render()
    expect(headTags).toContain('maximum-scale=1')
    expect(headTags.match(/name="viewport"/g)).toHaveLength(1)
  })

  it('entry options produce per-head shells with adjusted weight', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'x' }] }
    const a = createHead({ staticCache, disableDefaults: true })
    a.push(input as any, { static: true })
    const base = resolveTags(a)[0]
    const b = createHead({ staticCache, disableDefaults: true })
    b.push(input as any, { static: true, tagPriority: 1 })
    const t = resolveTags(b)[0]
    expect(t).not.toBe(base)
    expect(t._w).toBe(1)
    expect(t.tagPriority).toBe(1)
  })

  it('inline scripts in promoted entries stay escaped', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = {
      script: [{ innerHTML: 'if (1 < 2) console.log("</script><img src=x>")' }],
    }
    const a = createHead({ staticCache, disableDefaults: true })
    a.push(input as any, { static: true })
    const first = a.render().headTags
    const b = createHead({ staticCache, disableDefaults: true })
    b.push(input as any, { static: true })
    const second = b.render().headTags
    expect(second).toBe(first)
    expect(second).not.toContain('</script><img')
  })

  it('hook-replaced static tags are re-sanitized and re-rendered', () => {
    const staticCache: StaticEntryStore = {}
    const input: ResolvableHead = { meta: [{ name: 'description', content: 'orig %sep' }] }
    for (let i = 0; i < 2; i++)
      createHead({ staticCache, disableDefaults: true, init: [input] }).render()
    const head = createHead({ staticCache, disableDefaults: true, init: [input] })
    head.use({
      key: 'rewriter',
      hooks: {
        'tags:resolve': ({ tags }) => {
          for (let i = 0; i < tags.length; i++) {
            const t = tags[i]
            if (t.tag === 'meta' && t.props.name === 'description')
              tags[i] = { ...t, props: { ...t.props, content: 'replaced' } }
          }
        },
      },
    })
    expect(head.render().headTags).toContain('content="replaced"')
  })
})
