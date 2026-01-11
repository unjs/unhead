import { describe, expect, it } from 'vitest'
import { useDelayedSerializedDom, useDOMHead } from '../../util'

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

    // wait for auto-render
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta name="description" content="desc 2"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.dispose()

    // wait for auto-render after dispose
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
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
