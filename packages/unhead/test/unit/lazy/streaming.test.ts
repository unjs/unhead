import type { StreamingGlobal } from 'unhead/stream/client'
import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/lazy'
import { ServerOnlyCrawlerTagsPlugin } from 'unhead/plugins'
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
  it('keeps crawler tags from the server stream when client crawler tags are filtered', async () => {
    const { document, queue } = createStreamDocument()
    const head = createHead({ document, streamKey: 'pageHead', plugins: [ServerOnlyCrawlerTagsPlugin] })
    const description = () => document.querySelector('meta[name="description"]')?.getAttribute('content')

    try {
      queue.push([{ meta: [{ name: 'description', content: 'Queued on the server' }] }])
      head.finishHydration()
      await head.load()
      await vi.waitFor(() => expect(description()).toBe('Queued on the server'))

      head.push({ meta: [{ name: 'description', content: 'Client override' }] })
      queue.push([{ meta: [{ name: 'description', content: 'Streamed after load' }] }])
      await vi.waitFor(() => expect(description()).toBe('Streamed after load'))
    }
    finally {
      document.defaultView?.close()
    }
  })

  it('retries activation after a failing replay leaves the route', async () => {
    const { document, queue } = createStreamDocument()
    queue.push([{ title: 'Obsolete' }])
    let fail = true
    const head = createHead({
      document,
      streamKey: 'pageHead',
      plugins: [(client) => {
        const push = client.push
        client.push = (input, options) => {
          if (fail) {
            fail = false
            head.discardStream()
            throw new Error('route left during replay')
          }
          return push(input, options)
        }
        return { key: 'leave-once' }
      }],
    })
    try {
      await expect(head.load()).rejects.toThrow('route left during replay')
      head.push({ title: 'Destination' })
      await head.load()
      queue.push([{ title: 'Late obsolete' }])
      await vi.waitFor(() => expect(document.title).toBe('Destination'))
    }
    finally {
      document.defaultView?.close()
    }
  })

  it('retries stream replay after a push wrapper fails without losing patches or client renders', async () => {
    const { document, queue } = createStreamDocument()
    queue.push([
      { meta: [{ name: 'first', content: 'retained' }] },
      { title: 'Second streamed', meta: [{ name: 'second', content: 'retained' }] },
    ])
    let fail = true
    const head = createHead({
      document,
      streamKey: 'pageHead',
      plugins: [(client) => {
        const push = client.push
        client.push = (input, options) => {
          if (input.title === 'Second streamed' && fail) {
            fail = false
            queue.push([{ meta: [{ name: 'during-replay', content: 'retained' }] }])
            head.push({ meta: [{ name: 'from-hook', content: 'retained' }] })
            throw new Error('stream push failed once')
          }
          return push(input, options)
        }
        return { key: 'fail-once' }
      }],
    })
    const initial = head.push({ title: 'Initial client' })
    head.finishHydration()
    try {
      await expect(head.load()).rejects.toThrow('stream push failed once')
      initial.patch({ title: 'Updated after failure' })
      queue.push([{ meta: [{ name: 'after-failure', content: 'retained' }] }])
      await head.load()
      await vi.waitFor(() => {
        expect(document.title).toBe('Updated after failure')
        for (const name of ['first', 'second', 'during-replay', 'from-hook', 'after-failure'])
          expect(document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')).toBe('retained')
      })
      head.push({ title: 'Subsequent client' })
      await vi.waitFor(() => expect(document.title).toBe('Subsequent client'))
    }
    finally {
      document.defaultView?.close()
    }
  })

  it.each(['active push', 'active patch', 'replayed patch'] as const)('keeps streamed metadata above hydration defaults after early load: %s', async (operation) => {
    const { document, queue } = createStreamDocument()
    const head = createHead({ document, streamKey: 'pageHead' })
    const initial = operation === 'replayed patch' ? head.push({ title: 'Initial layout' }) : undefined
    queue.push([{ title: 'Page', meta: [{ name: 'description', content: 'Page description' }] }])
    await head.load()

    const layout = initial ?? head.push({ title: 'Layout', meta: [{ name: 'description', content: 'Layout description' }] })
    if (operation !== 'active push')
      layout.patch({ title: 'Updated layout', meta: [{ name: 'description', content: 'Updated layout description' }] })
    await vi.waitFor(() => {
      expect(document.title).toBe('Page')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Page description')
    })

    head.finishHydration()
    queue.push([{ title: 'Later page', meta: [{ name: 'description', content: 'Later page description' }] }])
    await vi.waitFor(() => {
      expect(document.title).toBe('Later page')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Later page description')
    })

    layout.patch({ title: 'Client', meta: [{ name: 'description', content: 'Client description' }] })
    queue.push([{ title: 'Last page', meta: [{ name: 'description', content: 'Last page description' }] }])
    await vi.waitFor(() => {
      expect(document.title).toBe('Client')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Client description')
    })
  })

  it.each(['before load', 'after load'])('lets streamed page metadata replace hydrated layout defaults %s', async (arrival) => {
    const { document, queue } = createStreamDocument()
    const head = createHead({ document, streamKey: 'pageHead' })
    head.push({ title: 'Layout', meta: [{ name: 'description', content: 'Layout description' }] })
    head.finishHydration()
    const page = { title: 'Page', meta: [{ name: 'description', content: 'Page description' }] }
    if (arrival === 'before load')
      queue.push([page])
    await head.load()
    if (arrival === 'after load')
      queue.push([page])

    await vi.waitFor(() => {
      expect(document.title).toBe('Page')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Page description')
    })

    head.push({ title: 'Client', meta: [{ name: 'description', content: 'Client description' }] })
    queue.push([{ title: 'Later page', meta: [{ name: 'description', content: 'Later page description' }] }])
    await vi.waitFor(() => {
      expect(document.title).toBe('Client')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Client description')
    })
  })

  it.each(['before load', 'after load'])('preserves a client update to a hydrated entry %s', async (update) => {
    const { document, queue } = createStreamDocument()
    const head = createHead({ document, streamKey: 'pageHead' })
    const layout = head.push({ title: 'Layout', meta: [{ name: 'description', content: 'Layout description' }] })
    head.finishHydration()
    const client = { title: 'Client', meta: [{ name: 'description', content: 'Client description' }] }
    if (update === 'before load')
      layout.patch(client)
    await head.load()
    if (update === 'after load')
      layout.patch(client)
    queue.push([{ title: 'Page', meta: [{ name: 'description', content: 'Page description' }] }])
    await vi.waitFor(() => {
      expect(document.title).toBe('Client')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Client description')
    })
  })

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
