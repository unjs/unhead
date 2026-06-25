import { describe, expect, it, vi } from 'vitest'
import { useHead } from '../../../src'
import { getActiveDom, useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom event handlers', () => {
  it('basic', async () => {
    const head = useDOMHead()

    useHead(head, {
      script: [
        {
          src: 'https://js.stripe.com/v3/',
          defer: true,
          // eslint-disable-next-line no-console
          onload: () => console.log('loaded stripe'),
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script src="https://js.stripe.com/v3/" defer="" data-onload=""></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('replaces element listeners without retaining stale handlers', () => {
    const head = useDOMHead()
    const dom = getActiveDom()!
    const first = vi.fn()
    const second = vi.fn()

    const entry = head.push({
      script: [{ key: 'analytics', src: '/analytics.js', onload: first }],
    })

    let script = dom.window.document.querySelector('script')!
    script.dispatchEvent(new dom.window.Event('load'))
    expect(first).toHaveBeenCalledOnce()

    entry.patch({
      script: [{ key: 'analytics', src: '/analytics.js', onload: second }],
    })

    script = dom.window.document.querySelector('script')!
    script.dispatchEvent(new dom.window.Event('load'))
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it('removes element listeners when a DOM tag is removed', () => {
    const head = useDOMHead()
    const dom = getActiveDom()!
    const onLoad = vi.fn()

    const entry = head.push({
      script: [{ key: 'removable', src: '/removable.js', onload: onLoad }],
    })

    const script = dom.window.document.querySelector('script')!
    script.dispatchEvent(new dom.window.Event('load'))
    expect(onLoad).toHaveBeenCalledOnce()

    entry.patch({})
    script.dispatchEvent(new dom.window.Event('load'))

    expect(onLoad).toHaveBeenCalledOnce()
    expect(dom.window.document.querySelector('script')).toBeNull()
  })

  it('replaces and removes bodyAttrs listeners on window', () => {
    const head = useDOMHead()
    const dom = getActiveDom()!
    const first = vi.fn()
    const second = vi.fn()

    const entry = head.push({
      bodyAttrs: { onresize: first },
    })

    dom.window.dispatchEvent(new dom.window.Event('resize'))
    expect(first).toHaveBeenCalledOnce()

    entry.patch({
      bodyAttrs: { onresize: second },
    })

    dom.window.dispatchEvent(new dom.window.Event('resize'))
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    expect(second.mock.contexts[0]).toBe(dom.window.document.body)

    entry.patch({ bodyAttrs: {} })
    dom.window.dispatchEvent(new dom.window.Event('resize'))

    expect(second).toHaveBeenCalledOnce()
    expect(dom.window.document.body.hasAttribute('data-onresize')).toBe(false)
  })
})
