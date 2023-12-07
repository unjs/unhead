import { describe, it } from 'vitest'
import { useHead } from 'unhead'
import type { SpeculationRules } from '@unhead/schema'
import { useDOMHead, useDelayedSerializedDom } from './util'

describe('dom innerHTML', () => {
  it('json', async () => {
    useDOMHead()

    useHead({
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
    useDOMHead()

    useHead({
      noscript: [
        {
          children: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
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
