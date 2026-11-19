import type { UseScriptInput } from '../../../src/scripts/types'
import { describe, expect, it, vi } from 'vitest'
import { createDomRenderer } from '../../../src/client'
import { useScript } from '../../../src/composables'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../../test/util'

const src = 'https://cdn.example.com/script.js'
const nextTask = () => new Promise(resolve => setTimeout(resolve))

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

function hydrate(inputs: UseScriptInput[] = [src], deferred = true) {
  const ssrHead = createServerHeadWithContext()
  for (const input of inputs)
    useScript(ssrHead, input, { trigger: 'server' })
  const dom = useDom(renderSSRHead(ssrHead))
  const document = dom.window.document
  const { head, flush } = createHead(document, deferred)
  const statuses: string[] = []
  head.hooks.hook('script:updated', ({ script }) => {
    statuses.push(script.status)
  })
  const serverEls = [...document.querySelectorAll('script')]
  return { dom, document, head, flush, statuses, serverEl: serverEls[0]!, serverEls }
}

describe('useScript trigger: server hydration', () => {
  it.each(renders.flatMap(([render, deferred]) => [
    ['unkeyed', render, src, deferred],
    ['keyed', render, { src, key: 'analytics' }, deferred],
  ] as const))('adopts an already loaded %s server script with %s render', async (_, __, input, deferred) => {
    const { document, head, flush, statuses, serverEl } = hydrate([input], deferred)
    serverEl.dataset.onloadfired = 'true'
    const onload = vi.fn()
    const onLoaded = vi.fn()

    const script = useScript(head, typeof input === 'string' ? { src: input, onload } : { ...input, onload }, {
      trigger: 'server',
      use: () => ({ ready: true }),
    })
    script.onLoaded(onLoaded)
    flush()
    head.push({ title: 'next' })
    flush()
    await nextTask()
    await expect(script.load()).resolves.toEqual({ ready: true })

    expect(script.status).toBe('loaded')
    expect(statuses).toEqual(['loaded'])
    expect(onload).toHaveBeenCalledOnce()
    expect(onLoaded).toHaveBeenCalledOnce()
    expect(onLoaded).toHaveBeenCalledWith({ ready: true })
    expect([...document.querySelectorAll('script')]).toEqual([serverEl])
  })

  it('reports the server status during hydration and the element state after it', async () => {
    const { head, statuses, serverEl } = hydrate()
    serverEl.dataset.onloadfired = 'true'

    const script = useScript(head, src, { trigger: 'server' })
    await Promise.resolve()

    // the server rendered 'loading', so a framework hydrates with the same status
    expect(script.status).toBe('loading')
    expect(statuses).toEqual([])
    await nextTask()
    expect(script.status).toBe('loaded')
    expect(statuses).toEqual(['loaded'])
  })

  it.each(renders)('waits for the server script load event with %s render', async (_, deferred) => {
    const { dom, document, head, flush, statuses, serverEl } = hydrate([src], deferred)
    const onLoaded = vi.fn()

    const script = useScript(head, src, { trigger: 'server' })
    script.onLoaded(onLoaded)
    flush()

    expect(script.status).toBe('loading')
    expect(statuses).toEqual([])
    serverEl.dispatchEvent(new dom.window.Event('load'))
    head.push({ title: 'next' })
    flush()
    await script.load()

    expect(script.status).toBe('loaded')
    expect(statuses).toEqual(['loaded'])
    expect(onLoaded).toHaveBeenCalledOnce()
    expect([...document.querySelectorAll('script')]).toEqual([serverEl])
  })

  it.each(renders)('adopts an unkeyed server script after %s render of another tag', async (_, deferred) => {
    const { document, head, flush, statuses, serverEl } = hydrate([src], deferred)
    serverEl.dataset.onloadfired = 'true'
    // the render scans the document and caches the server script before useScript runs
    head.push({ meta: [{ name: 'description', content: 'client' }] })
    flush()

    const script = useScript(head, src, { trigger: 'server' })
    flush()
    await nextTask()

    expect(script.status).toBe('loaded')
    expect(statuses).toEqual(['loaded'])
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(serverEl.isConnected).toBe(true)
  })

  it.each([
    ['the unkeyed script hydrates first', false],
    ['the keyed script hydrates first', true],
  ])('adopts keyed and unkeyed server scripts with the same src when %s', async (_, keyedFirst) => {
    const keyedInput = { src, key: 'analytics' }
    const { document, head, flush, serverEls } = hydrate([keyedInput, src])
    const [keyedEl, unkeyedEl] = serverEls
    serverEls.forEach(el => el.dataset.onloadfired = 'true')

    const first = useScript(head, keyedFirst ? keyedInput : src, { trigger: 'server' })
    const second = useScript(head, keyedFirst ? src : keyedInput, { trigger: 'server' })
    const [keyed, unkeyed] = keyedFirst ? [first, second] : [second, first]
    flush()
    await nextTask()

    expect([keyed.status, unkeyed.status]).toEqual(['loaded', 'loaded'])
    expect(keyedEl!.getAttribute('data-hid')).toBe('analytics')
    expect(document.querySelectorAll('script')).toHaveLength(2)

    unkeyed.remove()
    flush()
    expect(keyedEl!.isConnected).toBe(true)
    expect(unkeyedEl!.isConnected).toBe(false)
  })

  it.each(renders.flatMap(([render, deferred]) => [
    ['unkeyed', render, src, deferred],
    ['keyed', render, { src, key: 'analytics' }, deferred],
  ] as const))('reports a throwing onload of an already loaded %s server script with %s render', async (_, __, input, deferred) => {
    const { head, flush, serverEl } = hydrate([input], deferred)
    serverEl.dataset.onloadfired = 'true'
    const error = new Error('user onload failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onload = () => {
      throw error
    }

    const script = useScript(head, typeof input === 'string' ? { src: input, onload } : { ...input, onload }, {
      trigger: 'server',
    })
    flush()
    await nextTask()

    expect(script.status).toBe('loaded')
    expect(serverEl.isConnected).toBe(true)
    expect(consoleError).toHaveBeenCalledWith(error)
    consoleError.mockRestore()
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

  it('loads a client copy when a matching element lacks the server load flag handler', () => {
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
    // the element cannot report a load that already happened, so the client loads its own copy
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(2)
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
