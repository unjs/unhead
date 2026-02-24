import { JSDOM } from 'jsdom'
import { createStreamableHead } from 'unhead/stream/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { init as initIife } from '../../src/stream/iife'

let originalWindow: any
let originalDocument: any

beforeEach(() => {
  originalWindow = globalThis.window
  originalDocument = globalThis.document
})

afterEach(() => {
  globalThis.window = originalWindow
  globalThis.document = originalDocument
})

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
  // Simulate queued entries from SSR streaming (before iife runs)
  win[streamKey] = {
    _q: queuedEntries.map(e => [e]), // iife expects each item to be an array of entries
    push: (e: any) => win[streamKey]._q.push(e),
  }

  // Set globals for iife and createStreamableHead
  globalThis.window = win
  globalThis.document = win.document

  // Simulate iife running - this creates _head and processes queue
  initIife({ streamKey })

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

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.title).toBe('Streamed Title')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Streamed description')
    })

    it('replaces queue push with direct head push', async () => {
      const { window, document } = setupStreamingDom([
        { title: 'Initial Streamed' },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      // Simulate late-arriving streamed entry (push expects array of entries)
      window.__unhead__.push([{ title: 'Late Streamed' }])
      await waitForDomUpdate()

      expect(document.title).toBe('Late Streamed')
    })

    it('handles empty queue', async () => {
      const { document } = setupStreamingDom([])

      const head = createStreamableHead()
      expect(head).toBeDefined()
      await waitForDomUpdate()

      head!.push({ title: 'After Hydration' })
      await waitForDomUpdate()

      expect(document.title).toBe('After Hydration')
    })

    it('uses custom streamKey', async () => {
      const { document } = setupStreamingDom(
        [{ title: 'Custom Key Title' }],
        '__custom__',
      )

      createStreamableHead({ streamKey: '__custom__' })
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

      createStreamableHead()
      await waitForDomUpdate()

      // Last one wins
      expect(document.title).toBe('Third')
    })

    it('merges meta tags from multiple entries', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'author', content: 'John' }] },
        { meta: [{ name: 'keywords', content: 'test' }] },
      ])

      createStreamableHead()
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

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.documentElement.getAttribute('lang')).toBe('fr')
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    })

    it('applies bodyAttrs from queue', async () => {
      const { document } = setupStreamingDom([
        { bodyAttrs: { class: 'dark-mode' } },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.body.getAttribute('class')).toBe('dark-mode')
    })
  })

  describe('script and link tags', () => {
    it('adds script tags from queue', async () => {
      const { document } = setupStreamingDom([
        { script: [{ src: 'https://example.com/app.js' }] },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.querySelector('script[src="https://example.com/app.js"]')).toBeTruthy()
    })

    it('adds link tags from queue', async () => {
      const { document } = setupStreamingDom([
        { link: [{ rel: 'stylesheet', href: 'https://example.com/styles.css' }] },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.querySelector('link[href="https://example.com/styles.css"]')).toBeTruthy()
    })
  })

  describe('no queue present', () => {
    it('returns undefined when iife has not run', async () => {
      const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`)
      const win = dom.window as any

      // Temporarily set globals
      const savedWindow = globalThis.window
      globalThis.window = win

      const head = createStreamableHead()
      expect(head).toBeUndefined()

      globalThis.window = savedWindow
    })

    it('works with empty queue after iife runs', async () => {
      const { document } = setupStreamingDom([])

      const head = createStreamableHead()
      expect(head).toBeDefined()
      await waitForDomUpdate() // wait for hydration lock to release
      head!.push({ title: 'After Iife' })
      await waitForDomUpdate()

      expect(document.title).toBe('After Iife')
    })
  })

  describe('deduplication after hydration', () => {
    it('deduplicates meta tags after queue consumption', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'description', content: 'From stream' }] },
      ])

      const head = createStreamableHead()
      expect(head).toBeDefined()
      await waitForDomUpdate()

      head!.push({ meta: [{ name: 'description', content: 'Updated' }] })
      await waitForDomUpdate()

      const descriptions = document.querySelectorAll('meta[name="description"]')
      expect(descriptions.length).toBe(1)
      expect(descriptions[0].getAttribute('content')).toBe('Updated')
    })
  })

  describe('style tag updates with key', () => {
    it('updates style innerHTML when pushing styles with same key', async () => {
      const { window, document } = setupStreamingDom([])

      createStreamableHead()
      await waitForDomUpdate()

      // First push - creates style element (push expects array of entries)
      window.__unhead__.push([{
        style: [{ key: 'progress', innerHTML: '.progress{width:10%}' }],
      }])
      await waitForDomUpdate()

      let styles = document.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].innerHTML).toBe('.progress{width:10%}')

      // Second push with same key - should update, not create new
      window.__unhead__.push([{
        style: [{ key: 'progress', innerHTML: '.progress{width:50%}' }],
      }])
      await waitForDomUpdate()

      styles = document.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].innerHTML).toBe('.progress{width:50%}')

      // Third push with same key
      window.__unhead__.push([{
        style: [{ key: 'progress', innerHTML: '.progress{width:100%}' }],
      }])
      await waitForDomUpdate()

      styles = document.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].innerHTML).toBe('.progress{width:100%}')
    })

    it('creates separate styles for different keys', async () => {
      const { window, document } = setupStreamingDom([])

      createStreamableHead()
      await waitForDomUpdate()

      window.__unhead__.push([{
        style: [{ key: 'one', innerHTML: '.one{color:red}' }],
      }])
      await waitForDomUpdate()

      window.__unhead__.push([{
        style: [{ key: 'two', innerHTML: '.two{color:blue}' }],
      }])
      await waitForDomUpdate()

      const styles = document.querySelectorAll('style')
      expect(styles.length).toBe(2)
    })
  })
})
