import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDom } from '../../../../test/fixtures'
import { useScript } from '../../src/vanilla/useScript'

describe('unhead e2e scripts', () => {
  it('does not duplicate innerHTML', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    const input = {
      script: [
        {
          innerHTML: 'console.log(\'Hello World\')',
        },
      ],
    }
    // i.e App.vue
    useHead(input)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>console.log('Hello World')</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)
    const csrHead = createHead({
      document: dom.window.document,
    })
    csrHead.push(input)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script>console.log('Hello World')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('manually updating trigger', async () => {
    const dom = useDom()
    const csrHead = createHead({
      document: dom.window.document,
    })
    const promise = new Promise<void>(() => {})
    const script = useScript({
      src: 'https://cdn.example.com/script.js',
    }, {
      trigger: promise,
      head: csrHead,
    })

    const newPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 25)
    })
    expect(script.status).toBe('awaitingLoad')
    script.setupTriggerHandler(newPromise)
    expect(script.status).toBe('awaitingLoad')
    await newPromise

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 25)
    })
    expect(script.status).toBe('loading')
  })

  it('duplicate script registers', async () => {
    const dom = useDom()
    const csrHead = createHead({
      document: dom.window.document,
    })
    const neverResolves = new Promise<void>(() => {})
    const scriptA = useScript({
      src: 'https://cdn.example.com/script.js',
    }, {
      head: csrHead,
      trigger: neverResolves,
    })

    expect(scriptA._triggerAbortController?.signal.aborted).toBeFalsy()

    let originalAborted = false
    scriptA._triggerAbortController?.signal.addEventListener('abort', () => {
      originalAborted = true
    })

    // we're forcing a re-register of the script trigger
    const scriptB = useScript({
      src: 'https://cdn.example.com/script.js',
    }, {
      trigger: Promise.resolve(),
      head: csrHead,
    })

    // next tick
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 25)
    })

    expect(originalAborted).toBeTruthy()

    expect(scriptA.status).toEqual(scriptB.status)
    expect(scriptA.status).toEqual(`loading`)
  })
})
