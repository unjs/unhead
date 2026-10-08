import type { HeadTag, PropResolver } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'
import { normalizeEntryToTags } from '../../../src/utils'

describe('ssr hot path invariants', () => {
  it('resolves a wrapped root function before normalizing primitive tags', () => {
    const calls: Array<string | undefined> = []
    const resolver: PropResolver = (key, value) => {
      calls.push(key)
      return value && typeof value === 'object' && 'current' in value ? value.current : value
    }

    const tags = normalizeEntryToTags({
      current: () => ({
        noscript: 'fallback',
        style: 'body { color: red }',
        title: 'Resolved title',
      }),
    }, [resolver])

    expect(calls.slice(0, 2)).toEqual([undefined, undefined])
    expect(tags).toEqual([
      { tag: 'noscript', attrs: {}, props: {}, innerHTML: 'fallback' },
      { tag: 'style', attrs: {}, props: {}, innerHTML: 'body { color: red }' },
      { tag: 'title', attrs: {}, props: {}, textContent: 'Resolved title' },
    ])
  })

  it('preserves hook order, resolved tag identity, and later-entry precedence', () => {
    const order: string[] = []
    const resolvedTags: HeadTag[] = []
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'entries:resolve': () => order.push('entries:resolve'),
        'entries:normalize': () => order.push('entries:normalize'),
        'tags:beforeResolve': ({ tags }) => {
          order.push('tags:beforeResolve')
          resolvedTags.push(tags[0])
        },
        'tags:resolve': ({ tags }) => {
          order.push('tags:resolve')
          resolvedTags.push(tags[0])
        },
        'tags:afterResolve': ({ tags }) => {
          order.push('tags:afterResolve')
          resolvedTags.push(tags[0])
        },
        'ssr:render': ({ tags }) => {
          order.push('ssr:render')
          resolvedTags.push(tags[0])
        },
        'ssr:rendered': ({ tags }) => {
          order.push('ssr:rendered')
          resolvedTags.push(tags[0])
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'first' }] })
    head.push({ meta: [{ name: 'description', content: 'second' }] })

    const result = renderSSRHead(head)

    expect(order).toEqual([
      'entries:resolve',
      'entries:normalize',
      'entries:normalize',
      'tags:beforeResolve',
      'tags:resolve',
      'tags:afterResolve',
      'ssr:render',
      'ssr:rendered',
    ])
    expect(resolvedTags.every(tag => tag === resolvedTags[0])).toBe(true)
    expect(result.headTags).toBe('<meta name="description" content="second">')
  })

  it('filters unsafe attributes added at the SSR render boundary', () => {
    const inherited = { onload: 'alert(1)' }
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'ssr:render': ({ tags }) => {
          const attrs = Object.assign(Object.create(inherited), tags[0].attrs)
          attrs['bad name'] = 'unsafe'
          attrs.title = 'safe" onload="alert(1)'
          tags[0].attrs = attrs
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'safe' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="safe" title="safe&quot; onload=&quot;alert(1)">')
  })
})
