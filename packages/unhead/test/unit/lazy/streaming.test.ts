import type { StreamingGlobal } from 'unhead/stream/client'
import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/lazy'
import { createBootstrapScript } from 'unhead/stream/server'
import { describe, expect, it, vi } from 'vitest'

function createStreamDocument() {
  const dom = new JSDOM(
    `<!DOCTYPE html><title>Shell</title><link rel="stylesheet" href="/shell.css">${createBootstrapScript('pageHead')}`,
    { runScripts: 'dangerously' },
  )
  const queue = (dom.window as unknown as { pageHead: StreamingGlobal }).pageHead
  return { document: dom.window.document, queue }
}

describe('lazy head with streaming SSR', () => {
  it.each(['before navigation', 'after navigation'])('discards server-only patches with activation %s', async (activation) => {
    const { document, queue } = createStreamDocument()
    const head = createHead({ document, streamKey: 'pageHead' })
    head.push({ link: [{ rel: 'stylesheet', href: '/shell.css' }] })
    head.finishHydration()
    const patch = { link: [{ rel: 'stylesheet' as const, href: '/streamed-route.css' }] }
    queue.push([patch])

    if (activation === 'before navigation') {
      await head.load()
      await vi.waitFor(() => expect(document.querySelector('link[href="/streamed-route.css"]')).toBeTruthy())
    }

    head.discardStream()
    const destination = head.push({ link: [{ rel: 'stylesheet', href: '/destination.css' }] })
    queue.push([patch])
    await head.load()
    queue.push([patch])

    await vi.waitFor(() => {
      expect([...document.querySelectorAll('link[rel="stylesheet"]')].map(el => el.getAttribute('href')))
        .toEqual(['/shell.css', '/destination.css'])
    })
    destination.patch({ title: 'Destination' })
    await vi.waitFor(() => expect(document.title).toBe('Destination'))
    expect(document.querySelector('link[href="/streamed-route.css"]')).toBeNull()
  })

  it('discards the rest of a batch if a hook leaves the route during replay', async () => {
    const { document, queue } = createStreamDocument()
    queue.push([{ title: 'Obsolete' }, { meta: [{ name: 'obsolete', content: 'yes' }] }])
    const head = createHead({
      document,
      streamKey: 'pageHead',
      hooks: {
        'entries:updated': (): void => head.discardStream(),
      },
    })
    await head.load()
    head.push({ title: 'Live' })
    await vi.waitFor(() => expect(document.title).toBe('Live'))
    expect(document.querySelector('meta[name="obsolete"]')).toBeNull()
  })

  it('reports a missing stream queue on load and retries once the bootstrap is available', async () => {
    const { document, queue } = createStreamDocument()
    const window = document.defaultView as unknown as { pageHead?: StreamingGlobal }
    delete window.pageHead
    const plugin = vi.fn(() => ({ key: 'stream-plugin' }))
    const head = createHead({ document, streamKey: 'pageHead', lazyPlugins: async () => [plugin] })

    await expect(head.load()).rejects.toThrow('server bootstrap')
    expect(document.title).toBe('Shell')

    const stylesheet = head.push({ link: [{ rel: 'stylesheet', href: '/shell.css' }] })
    stylesheet.dispose()
    window.pageHead = queue
    queue.push([{ title: 'Streamed' }])
    await head.load()
    expect(plugin).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => {
      expect(document.title).toBe('Streamed')
      expect(document.querySelectorAll('link[href="/shell.css"]')).toHaveLength(0)
    })
  })

  it('preserves patch order through activation', async () => {
    const { document, queue } = createStreamDocument()
    queue.push([{ title: 'First patch' }])
    let ready!: () => void
    const pluginReady = new Promise<void>((resolve) => {
      ready = resolve
    })
    const lazyPlugins = vi.fn(() => pluginReady.then(() => []))
    const head = createHead({ document, streamKey: 'pageHead', lazyPlugins })
    head.finishHydration()
    queue.push([{ title: 'Second patch' }])
    expect(document.title).toBe('Shell')

    const loading = head.load()
    queue.push([{ title: 'During load' }])
    expect(document.title).toBe('Shell')
    ready()
    const client = await loading
    await vi.waitFor(() => expect(document.title).toBe('During load'))
    expect(queue._head).toBe(client)

    queue.push([{ title: 'After load' }])
    await vi.waitFor(() => expect(document.title).toBe('After load'))
  })

  it('applies a patch received during replay after the existing backlog', async () => {
    const { document, queue } = createStreamDocument()
    queue.push([{ title: 'First queued patch' }])
    queue.push([{ title: 'Second queued patch' }])
    let sent = false
    const head = createHead({
      document,
      streamKey: 'pageHead',
      hooks: {
        'entries:updated': () => {
          if (!sent) {
            sent = true
            queue.push([{ title: 'Patch received during replay' }])
          }
        },
      },
    })

    await head.load()
    await vi.waitFor(() => expect(document.title).toBe('Patch received during replay'))
  })

  it('retains the SSR cleanup baseline and lets client entries win over streamed fallbacks', async () => {
    const { document, queue } = createStreamDocument()
    const head = createHead({ document, streamKey: 'pageHead' })
    const stylesheet = head.push({ link: [{ rel: 'stylesheet', href: '/shell.css' }] })
    stylesheet.dispose()
    head.finishHydration()
    head.push({ title: 'Client' })
    queue.push([{ title: 'Late server title' }])
    await Promise.resolve()
    expect(document.title).toBe('Shell')
    expect(document.querySelector('link[href="/shell.css"]')).toBeTruthy()

    await head.load()
    await vi.waitFor(() => {
      expect(document.title).toBe('Client')
      expect(document.querySelector('link[href="/shell.css"]')).toBeNull()
    })
  })
})
