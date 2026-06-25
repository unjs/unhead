import { renderDOMHead } from '@unhead/dom'
import { describe, expect, it, vi } from 'vitest'
import { useHead } from '../../../src'
import { createClientHeadWithContext, useDom } from '../../util'

describe('state', () => {
  it('exists', async () => {
    const head = createClientHeadWithContext()
    useHead(head, {
      title: 'hello',
    })

    expect(head.entries).toMatchInlineSnapshot(`
      Map {
        1 => {
          "_i": 1,
          "_o": {
            "title": "hello",
          },
          "input": {
            "title": "hello",
          },
          "options": {},
        },
      }
    `)
  })

  it('does not reuse DOM state across document instances', () => {
    const first = useDom()
    const second = useDom()
    const onResize = vi.fn()
    const head = createClientHeadWithContext({ document: first.window.document })

    useHead(head, {
      bodyAttrs: {
        class: 'active',
        onresize: onResize,
      },
      meta: [{ name: 'description', content: 'from-state' }],
    })

    expect(first.window.document.body.classList.contains('active')).toBe(true)
    expect(first.window.document.querySelector('meta[name="description"]')).not.toBeNull()

    renderDOMHead(head, { document: second.window.document })

    expect(first.window.document.body.classList.contains('active')).toBe(false)
    expect(first.window.document.querySelector('meta[name="description"]')).toBeNull()

    first.window.dispatchEvent(new first.window.Event('resize'))
    expect(onResize).not.toHaveBeenCalled()

    expect(second.window.document.body.classList.contains('active')).toBe(true)
    expect(second.window.document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('from-state')

    second.window.dispatchEvent(new second.window.Event('resize'))
    expect(onResize).toHaveBeenCalledOnce()
    expect(onResize.mock.contexts[0]).toBe(second.window.document.body)
  })
})
