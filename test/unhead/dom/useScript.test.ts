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

      <script async=\\"\\" fetchpriority=\\"low\\" src=\\"https://cdn.example.com/script.js\\" onload=\\"this.dataset.onload = true\\" onerror=\\"this.dataset.onerror = true\\" onabort=\\"this.dataset.onabort = true\\" onprogress=\\"this.dataset.onprogress = true\\" onloadstart=\\"this.dataset.onloadstart = true\\" data-hid=\\"438d65b\\" data-h-load=\\"\\" data-h-error=\\"\\" data-h-abort=\\"\\" data-h-progress=\\"\\" data-h-loadstart=\\"\\"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
