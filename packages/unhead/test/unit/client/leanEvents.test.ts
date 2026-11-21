// @vitest-environment jsdom
import { createHead, enableDomEventHandlers } from 'unhead/client/lean'
import { useScript } from 'unhead/scripts'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('lean client event handlers', () => {
  it('ignores function event attributes until enabled on the head', () => {
    const head = createHead()
    const onload = vi.fn()
    const entry = head.push({ script: [{ key: 'raw', src: '/raw.js', onload }] })
    const script = document.querySelector('script')!

    script.dispatchEvent(new Event('load'))
    expect(onload).not.toHaveBeenCalled()
    expect(script.hasAttribute('onload')).toBe(false)

    enableDomEventHandlers(head)
    script.dispatchEvent(new Event('load'))
    expect(onload).toHaveBeenCalledOnce()

    entry.dispose()
    script.dispatchEvent(new Event('load'))
    expect(onload).toHaveBeenCalledOnce()
  })

  it.each(['load', 'error'] as const)('settles useScript after a native %s event', async (type) => {
    const head = createHead()
    const script = useScript(head, '/external.js', { trigger: 'manual' })
    const settled = vi.fn()
    if (type === 'load')
      script.onLoaded(settled)
    else
      script.onError(settled)
    const loaded = script.load()

    document.querySelector('script')!.dispatchEvent(new Event(type))
    await loaded
    expect(script.status).toBe(type === 'load' ? 'loaded' : 'error')
    expect(settled).toHaveBeenCalledOnce()
    script.remove()
  })
})
