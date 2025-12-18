import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createStreamableHead } from '../../src/client'

function setupStreamingDom(queuedEntries: any[] = [], streamKey = '__unhead__') {
  const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head>
<title>Initial</title>
<script>window.${streamKey}={_q:[],push(e){this._q.push(e)}}</script>
</head>
<body></body>
</html>`)

  const win = dom.window as any
  // Simulate queued entries from SSR streaming
  win[streamKey] = {
    _q: queuedEntries,
    push: (e: any) => win[streamKey]._q.push(e),
  }

  return { dom, window: win, document: win.document }
}

function waitForDomUpdate() {
  return new Promise(resolve => setTimeout(resolve, 50))
}

describe('streaming client hydration', () => {
  describe('queue consumption', () => {
    it('processes queued entries on creation', async () => {
      const { document } = setupStreamingDom([
        { title: 'Streamed Title' },
        { meta: [{ name: 'description', content: 'Streamed description' }] },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.title).toBe('Streamed Title')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Streamed description')
    })

    it('replaces queue push with direct head push', async () => {
      const { window, document } = setupStreamingDom([
        { title: 'Initial Streamed' },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      // Simulate late-arriving streamed entry
      window.__unhead__.push({ title: 'Late Streamed' })
      await waitForDomUpdate()

      expect(document.title).toBe('Late Streamed')
    })

    it('handles empty queue', async () => {
      const { document } = setupStreamingDom([])

      const head = createStreamableHead({ document })
      await waitForDomUpdate()

      head.push({ title: 'After Hydration' })
      await waitForDomUpdate()

      expect(document.title).toBe('After Hydration')
    })

    it('uses custom streamKey', async () => {
      const { document } = setupStreamingDom(
        [{ title: 'Custom Key Title' }],
        '__custom__',
      )

      createStreamableHead({ document, streamKey: '__custom__' })
      await waitForDomUpdate()

      expect(document.title).toBe('Custom Key Title')
    })
  })

  describe('multiple entries', () => {
    it('processes multiple queued entries in order', async () => {
      const { document } = setupStreamingDom([
        { title: 'First' },
        { title: 'Second' },
        { title: 'Third' },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      // Last one wins
      expect(document.title).toBe('Third')
    })

    it('merges meta tags from multiple entries', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'author', content: 'John' }] },
        { meta: [{ name: 'keywords', content: 'test' }] },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('John')
      expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('test')
    })
  })

  describe('htmlAttrs and bodyAttrs', () => {
    it('applies htmlAttrs from queue', async () => {
      const { document } = setupStreamingDom([
        { htmlAttrs: { lang: 'fr', dir: 'rtl' } },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.documentElement.getAttribute('lang')).toBe('fr')
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    })

    it('applies bodyAttrs from queue', async () => {
      const { document } = setupStreamingDom([
        { bodyAttrs: { class: 'dark-mode' } },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.body.getAttribute('class')).toBe('dark-mode')
    })
  })

  describe('script and link tags', () => {
    it('adds script tags from queue', async () => {
      const { document } = setupStreamingDom([
        { script: [{ src: 'https://example.com/app.js' }] },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.querySelector('script[src="https://example.com/app.js"]')).toBeTruthy()
    })

    it('adds link tags from queue', async () => {
      const { document } = setupStreamingDom([
        { link: [{ rel: 'stylesheet', href: 'https://example.com/styles.css' }] },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.querySelector('link[href="https://example.com/styles.css"]')).toBeTruthy()
    })
  })

  describe('no queue present', () => {
    it('works when window.__unhead__ does not exist', async () => {
      const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`)
      const document = dom.window.document

      const head = createStreamableHead({ document })
      head.push({ title: 'No Queue' })
      await waitForDomUpdate()

      expect(document.title).toBe('No Queue')
    })
  })

  describe('deduplication after hydration', () => {
    it('deduplicates meta tags after queue consumption', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'description', content: 'From stream' }] },
      ])

      const head = createStreamableHead({ document })
      await waitForDomUpdate()

      head.push({ meta: [{ name: 'description', content: 'Updated' }] })
      await waitForDomUpdate()

      const descriptions = document.querySelectorAll('meta[name="description"]')
      expect(descriptions.length).toBe(1)
      expect(descriptions[0].getAttribute('content')).toBe('Updated')
    })
  })
})
