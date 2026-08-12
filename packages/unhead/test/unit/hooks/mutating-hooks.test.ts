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
              ;(tag.props.class as unknown as Set<string>).add(`render-${render}`)
              ;(tag.props.style as unknown as Map<string, string>).set(`--render-${render}`, '1')
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

  it('filters invalid attributes added by render hooks', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'ssr:render': ({ tags }) => {
          tags[0].props['invalid name'] = 'hidden'
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'visible' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="visible">')
  })

  it('filters invalid attributes from resolved tags', () => {
    const head = createHead({ disableDefaults: true })
    const result = renderSSRHead(head, {
      resolvedTags: [{
        tag: 'meta',
        props: { 'name': 'description', 'content': 'visible', 'invalid name': 'hidden' },
      }],
    })

    expect(result.headTags).toBe('<meta name="description" content="visible">')
  })

  it('filters invalid attributes from object titles', () => {
    const head = createHead({ disableDefaults: true })
    head.push({
      title: {
        'textContent': 'visible',
        'invalid name': 'hidden',
      },
    } as any)

    expect(renderSSRHead(head).headTags).toBe('<title>visible</title>')
  })

  it('sees render hooks registered before rendering starts', () => {
    const head = createHead({
      disableDefaults: true,
      hooks: {
        'ssr:beforeRender': () => {
          head.hooks.hook('ssr:render', ({ tags }) => {
            tags[0].props['invalid name'] = 'hidden'
          })
        },
      },
    })
    head.push({ meta: [{ name: 'description', content: 'visible' }] })

    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="visible">')
  })
})
