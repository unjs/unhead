import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead } from '../../../src/server'

describe('tag-mutating hooks', () => {
  it('hook mutations do not leak into the entry cache across renders', async () => {
    let render = 0
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'tags:resolve': (ctx) => {
          for (const tag of ctx.tags) {
            if (tag.tag === 'htmlAttrs') {
              ;(tag.props.class as Set<string>).add(`render-${render}`)
              ;(tag.props.style as Map<string, string>).set(`--render-${render}`, '1')
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
