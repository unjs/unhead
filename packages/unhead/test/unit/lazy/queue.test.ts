import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/lazy'
import { describe, expect, it, vi } from 'vitest'

describe('framework-controlled head', () => {
  it('queues a patch and disposal across hydration until the framework loads it', async () => {
    const { document } = new JSDOM('<title>SSR</title><link rel="stylesheet" href="/old.css">').window
    const head = createHead({ document })
    const title = head.push({ title: 'SSR' })
    const stylesheet = head.push({ link: [{ rel: 'stylesheet', href: '/old.css' }] })
    head.finishHydration()
    title.patch({ title: 'Next page' })
    stylesheet.dispose()
    expect(head.render()).toBe(false)
    expect(document.title).toBe('SSR')
    expect(document.querySelector('link[href="/old.css"]')).toBeTruthy()
    await head.load()
    await vi.waitFor(() => {
      expect(document.title).toBe('Next page')
      expect(document.querySelector('link[href="/old.css"]')).toBeNull()
    })
  })

  it('applies updates made by a hook during handoff', async () => {
    const { document } = new JSDOM('<title>SSR</title>').window
    let replaying = false
    let patchTitle: (input: { title: string }) => void
    const head = createHead({
      document,
      hooks: {
        'entries:updated': () => {
          if (replaying)
            return
          replaying = true
          patchTitle({ title: 'Updated by hook' })
          head.push({ meta: [{ name: 'replayed', content: 'yes' }] })
        },
      },
    })
    patchTitle = head.push({ title: 'SSR' }).patch

    await head.load()
    await vi.waitFor(() => {
      expect(document.title).toBe('Updated by hook')
      expect(document.querySelector('meta[name="replayed"]')?.getAttribute('content')).toBe('yes')
    })
  })
})
