import { describe, it } from 'vitest'
import { useScript } from 'unhead'
import { useDOMHead, useDelayedSerializedDom } from './util'

describe('dom useScript', () => {
  it('basic', async () => {
    useDOMHead()

    useScript({
      src: 'https://cdn.example.com/script.js',
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script data-onload="" data-onerror="" data-onabort="" data-onprogress="" data-onloadstart="" defer="" fetchpriority="low" src="https://cdn.example.com/script.js" data-hid="438d65b"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
