import { renderDOMHead } from '@unhead/dom'
import { describe, expect, it } from 'vitest'
import { useHead } from '../../../src'
import { basicSchema, useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom', () => {
  it('basic', async () => {
    const head = useDOMHead()

    useHead(head, basicSchema)

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang="en" dir="ltr"><head>

      <script src="https://cdn.example.com/script.js"></script><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('boolean attributes respected', async () => {
    const head = useDOMHead()

    head.push({
      script: [
        {
          defer: true,
          async: false,
          src: 'https://cdn.example.com/script.js',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script defer="" src="https://cdn.example.com/script.js"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('guards reentrant beforeRender renders and keeps mutations', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    let beforeCalls = 0

    head.hooks.hook('dom:beforeRender', () => {
      beforeCalls++
      if (beforeCalls === 1) {
        head.push({ meta: [{ name: 'before-render', content: 'included' }] })
        expect(renderDOMHead(head, { document })).toBe(false)
      }
    })

    head.push({ title: 'Initial' })

    expect(beforeCalls).toBe(1)
    expect(document.title).toBe('Initial')
    expect(document.querySelector('meta[name="before-render"]')?.getAttribute('content')).toBe('included')
  })

  it('renders mutations made by dom:rendered in a follow-up pass', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    let renders = 0

    head.hooks.hook('dom:rendered', () => {
      renders++
      if (renders === 1)
        head.push({ meta: [{ name: 'description', content: 'from-hook' }] })
    })

    head.push({ title: 'Initial' })

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('from-hook')
    expect(renders).toBe(2)
    expect(head.dirty).toBe(false)
  })
})
