import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDelayedSerializedDom, useDOMHead } from './util'

describe('dom position', () => {
  it('body', async () => {
    useDOMHead()

    useHead({
      script: [
        {
          innerHTML: 'Hello World',
          tagPosition: 'bodyClose',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      <script>Hello World</script></body></html>"
    `)
  })
})
