import type { SpeculationRules } from '@unhead/schema'
import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom innerHTML', () => {
  it('json', async () => {
    const head = useDOMHead()

    useHead(head, {
      script: [
        {
          innerHTML: {
            test: 'test',
            something: {
              else: 123,
            },
          },
        },
        {
          type: 'speculationrules',
          innerHTML: <SpeculationRules> {
            prefetch: [
              {
                source: 'list',
                urls: ['/test'],
                requires: ['anonymous-client-ip-when-cross-origin'],
              },
            ],
          },
        },
      ],
    })
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script type="application/json">{"test":"test","something":{"else":123}}</script><script type="speculationrules">{"prefetch":[{"source":"list","urls":["/test"],"requires":["anonymous-client-ip-when-cross-origin"]}]}</script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('noscript', async () => {
    const head = useDOMHead()

    useHead(head, {
      noscript: [
        {
          innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    })
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <noscript>&lt;iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
          height="0" width="0" style="display:none;visibility:hidden"&gt;&lt;/iframe&gt;</noscript></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
