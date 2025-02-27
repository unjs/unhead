import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom position', () => {
  it('body', async () => {
    const head = useDOMHead()

    useHead(head, {
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
