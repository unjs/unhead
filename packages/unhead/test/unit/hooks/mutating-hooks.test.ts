import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('tag-mutating hooks', () => {
  it('runs tag:normalise before tag weighting and deduplication', async () => {
    const calls: string[] = []
    const head = createHead({
      disableDefaults: true,
      tagWeight: (tag) => {
        calls.push(`weight:${tag.props.content}`)
        return 100
      },
      hooks: {
        'tag:normalise': ({ tag, entry, resolvedOptions }) => {
          calls.push(`normalise:${tag.props.content}`)
          expect(entry.input).toMatchObject({ meta: [{ name: 'description' }] })
          expect(resolvedOptions._tagWeight).toBeTypeOf('function')
          tag.props.content = 'after-hook'
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'before-hook' }] })

    const result = await head.render()

    expect(calls).toEqual(['normalise:before-hook', 'weight:after-hook'])
    expect(result.headTags).toContain('content="after-hook"')
  })

  it('hook mutations do not leak into the entry cache across renders', async () => {
    let render = 0
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': (ctx) => {
          for (const tag of ctx.tags) {
            if (tag.tag === 'htmlAttrs') {
              tag.props.class!.add(`render-${render}`)
              tag.props.style!.set(`--render-${render}`, '1')
            }
          }
        },
      },
    })
    head.push({
      htmlAttrs: { class: 'base', style: 'color:red' },
    })

    render = 1
    const first = await renderSSRHead(head)
    render = 2
    const second = await renderSSRHead(head)

    expect(first.htmlAttrs).toContain('render-1')
    // mutations from the first render must not survive in the cached entry tags
    expect(second.htmlAttrs).not.toContain('render-1')
    expect(second.htmlAttrs).toContain('render-2')
  })
})
