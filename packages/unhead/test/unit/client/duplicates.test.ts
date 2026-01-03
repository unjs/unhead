import { describe, expect, it } from 'vitest'
import { getActiveDom, useDOMHead } from '../../util'

describe('dom', () => {
  it('basic', async () => {
    const head = useDOMHead()

    const entry = head.push({
      meta: [
        {
          name: 'description',
          content: 'desc',
        },
        {
          name: 'description',
          content: 'desc 2',
        },
      ],
    })

    // Wait for the head to render (it auto-renders on entries:updated)
    await new Promise(resolve => setTimeout(resolve, 10))
    const dom = getActiveDom()!

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta name="description" content="desc 2"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.dispose()

    // Wait for the head to re-render after dispose
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
