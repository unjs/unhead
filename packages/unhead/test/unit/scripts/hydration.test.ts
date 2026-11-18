import type { UseScriptInput } from '../../../src/scripts/types'
import { describe, expect, it, vi } from 'vitest'
import { createDomRenderer } from '../../../src/client'
import { useScript } from '../../../src/composables'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../../test/util'

const src = 'https://cdn.example.com/script.js'

// The default client head renders inside push(). The deferred head renders only on
// flush(), as the Vue head defers its render to a timeout.
function createHead(document: Document, deferred = true) {
  if (!deferred) {
    const head = createClientHeadWithContext({ document })
    return { head, flush: () => head.render() }
  }
  const head = createClientHeadWithContext({ document, render: () => false })
  const render = createDomRenderer({ document })
  return { head, flush: () => render(head) }
}

const renders = [['a deferred', true], ['an immediate', false]] as const

function hydrate(input: UseScriptInput = src, deferred = true) {
  const ssrHead = createServerHeadWithContext()
  useScript(ssrHead, input, { trigger: 'server' })
  const dom = useDom(renderSSRHead(ssrHead))
  const document = dom.window.document
  const { head, flush } = createHead(document, deferred)
  const statuses: string[] = []
  head.hooks.hook('script:updated', ({ script }) => {
    statuses.push(script.status)
  })
  const serverEl = document.querySelector('script')!
  return { dom, document, head, flush, statuses, serverEl }
}

describe('useScript trigger: server hydration', () => {
  it.each(renders.flatMap(([render, deferred]) => [
    ['unkeyed', render, src, deferred],
    ['keyed', render, { src, key: 'analytics' }, deferred],
  ] as const))('adopts an already loaded %s server script with %s render', async (_, __, input, deferred) => {
    const { document, head, flush, statuses, serverEl } = hydrate(input, deferred)
    serverEl.dataset.onloadfired = 'true'
    const onload = vi.fn()
    const onLoaded = vi.fn()

    const script = useScript(head, typeof input === 'string' ? { src: input, onload } : { ...input, onload }, {
      trigger: 'server',
      use: () => ({ ready: true }),
    })
    script.onLoaded(onLoaded)

    expect(script.status).toBe('loaded')
    flush()
    head.push({ title: 'next' })
    flush()
    await expect(script.load()).resolves.toEqual({ ready: true })

    expect(statuses).toEqual(['loaded'])
    expect(onload).toHaveBeenCalledOnce()
    expect(onLoaded).toHaveBeenCalledOnce()
    expect(onLoaded).toHaveBeenCalledWith({ ready: true })
    expect([...document.querySelectorAll('script')]).toEqual([serverEl])
  })

  it.each(renders)('waits for the server script load event with %s render', async (_, deferred) => {
    const { dom, document, head, flush, statuses, serverEl } = hydrate(src, deferred)
    const onLoaded = vi.fn()

    const script = useScript(head, src, { trigger: 'server' })
    script.onLoaded(onLoaded)
    flush()

    expect(script.status).toBe('awaitingLoad')
    serverEl.dispatchEvent(new dom.window.Event('load'))
    head.push({ title: 'next' })
    flush()
    await script.load()

    expect(script.status).toBe('loaded')
    expect(statuses).toEqual(['loaded'])
    expect(onLoaded).toHaveBeenCalledOnce()
    expect([...document.querySelectorAll('script')]).toEqual([serverEl])
  })

  it.each(renders)('adopts an unkeyed server script after %s render of another tag', (_, deferred) => {
    const { document, head, flush, statuses, serverEl } = hydrate(src, deferred)
    serverEl.dataset.onloadfired = 'true'
    // the render scans the document and caches the server script before useScript runs
    head.push({ meta: [{ name: 'description', content: 'client' }] })
    flush()

    const script = useScript(head, src, { trigger: 'server' })
    flush()

    expect(script.status).toBe('loaded')
    expect(statuses).toEqual(['loaded'])
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(serverEl.isConnected).toBe(true)
  })

  it('adopts a server script that already failed', async () => {
    const { head, flush, statuses, serverEl } = hydrate()
    serverEl.dataset.onerrorfired = 'true'
    const onLoaded = vi.fn()
    const onError = vi.fn()

    const script = useScript(head, src, { trigger: 'server' })
    script.onLoaded(onLoaded)
    script.onError(onError)
    flush()

    await expect(script.load()).resolves.toBe(false)
    expect(statuses).toEqual(['error'])
    expect(onError).toHaveBeenCalledOnce()
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('reports a server script error that fires after hydration', async () => {
    const { dom, head, statuses, serverEl } = hydrate()
    const onError = vi.fn()

    const script = useScript(head, src, { trigger: 'server' })
    script.onError(onError)
    serverEl.dispatchEvent(new dom.window.Event('error'))

    await expect(script.load()).resolves.toBe(false)
    expect(statuses).toEqual(['error'])
    expect(onError).toHaveBeenCalledOnce()
  })

  it('loads the script when the server did not render it', async () => {
    const document = useDom().window.document
    const { head, flush } = createHead(document)
    const statuses: string[] = []
    head.hooks.hook('script:updated', ({ script }) => {
      statuses.push(script.status)
    })

    const script = useScript(head, src, { trigger: 'server' })
    flush()

    expect(statuses).toEqual(['loading'])
    expect(script.status).toBe('loading')
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1)
  })

  it('loads the script when a matching element lacks the server load flag handler', () => {
    const document = useDom({ headTags: `<script src="${src}"></script>` }).window.document
    const { head, flush } = createHead(document)
    const statuses: string[] = []
    head.hooks.hook('script:updated', ({ script }) => {
      statuses.push(script.status)
    })

    const script = useScript(head, src, { trigger: 'server' })
    flush()

    expect(statuses).toEqual(['loading'])
    expect(script.status).toBe('loading')
  })

  it('removes the adopted server script', () => {
    const { document, head, flush, serverEl } = hydrate()
    serverEl.dataset.onloadfired = 'true'

    const script = useScript(head, src, { trigger: 'server' })
    flush()
    script.remove()
    flush()

    expect(script.status).toBe('removed')
    expect(serverEl.isConnected).toBe(false)
    expect(document.querySelector('script')).toBeNull()
  })

  it('removes the server script when removed before the first render', () => {
    const { document, head, flush, serverEl } = hydrate()

    const script = useScript(head, src, { trigger: 'server' })
    script.remove()
    flush()

    expect(serverEl.isConnected).toBe(false)
    expect(document.querySelector('script')).toBeNull()
  })
})
