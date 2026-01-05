import { JSDOM } from 'jsdom'
import { init as initIife } from 'unhead/stream/iife'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createStreamableHead } from '../src/stream/client'

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
  // Simulate queued entries from SSR streaming (iife expects array of entries)
  win[streamKey] = {
    _q: queuedEntries.map(e => [e]),
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

describe('vue streaming client hydration', () => {
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

      // Simulate late-arriving streamed entry (push expects array of entries)
      window.__unhead__.push([{ title: 'Late Streamed' }])
      await waitForDomUpdate()

      expect(document.title).toBe('Late Streamed')
    })

    it('handles empty queue', async () => {
      const { document } = setupStreamingDom([])

      const head = createStreamableHead({ document })
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
    it('returns undefined when iife has not run', async () => {
      const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`)
      const win = dom.window as any

      // Temporarily set globals without running iife
      const savedWindow = globalThis.window
      globalThis.window = win

      const head = createStreamableHead({ document: win.document })
      expect(head).toBeUndefined()

      globalThis.window = savedWindow
    })
  })

  describe('deduplication after hydration', () => {
    it('deduplicates meta tags after queue consumption', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'description', content: 'From stream' }] },
      ])

      const head = createStreamableHead({ document })
      expect(head).toBeDefined()
      await waitForDomUpdate()

      head!.push({ meta: [{ name: 'description', content: 'Updated' }] })
      await waitForDomUpdate()

      const descriptions = document.querySelectorAll('meta[name="description"]')
      expect(descriptions.length).toBe(1)
      expect(descriptions[0].getAttribute('content')).toBe('Updated')
    })
  })

  describe('vue install method', () => {
    it('has install method for Vue app.use()', async () => {
      const { document } = setupStreamingDom([])
      const head = createStreamableHead({ document })
      expect(head).toBeDefined()
      expect(typeof head!.install).toBe('function')
    })
  })

  describe('style tag updates with key', () => {
    it('updates style innerHTML when pushing styles with same key', async () => {
      const { window, document } = setupStreamingDom([])

      createStreamableHead({ document })
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

      createStreamableHead({ document })
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

  describe('streaming hydration replay', () => {
    it('replays head tags streamed during SSR', async () => {
      // Simulate what SSR sends - multiple push calls via streamed scripts
      const { document } = setupStreamingDom([
        // Initial shell head
        { title: 'Shell Title', htmlAttrs: { lang: 'en' } },
        // First async component
        { title: 'Async 1', meta: [{ property: 'og:title', content: 'Async 1' }] },
        // Second async component
        { title: 'Async 2', meta: [{ property: 'og:description', content: 'Async 2 desc' }] },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      // Final title should be the last one
      expect(document.title).toBe('Async 2')

      // HTML attrs from first entry should be applied
      expect(document.documentElement.getAttribute('lang')).toBe('en')

      // Meta tags should be present
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Async 1')
      expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Async 2 desc')
    })

    it('handles late-arriving streamed entries after hydration', async () => {
      const { window, document } = setupStreamingDom([
        { title: 'Initial' },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.title).toBe('Initial')

      // Simulate more streaming content arriving after hydration started
      window.__unhead__.push([{ title: 'Late Entry 1' }])
      await waitForDomUpdate()
      expect(document.title).toBe('Late Entry 1')

      window.__unhead__.push([{ title: 'Late Entry 2' }])
      await waitForDomUpdate()
      expect(document.title).toBe('Late Entry 2')
    })
  })

  describe('streaming with Vue refs', () => {
    it('handles reactive values in streamed entries', async () => {
      const { document } = setupStreamingDom([
        // Simulating what Vue might serialize
        { title: 'Reactive Title' },
        { meta: [{ name: 'reactive', content: 'value' }] },
      ])

      createStreamableHead({ document })
      await waitForDomUpdate()

      expect(document.title).toBe('Reactive Title')
      expect(document.querySelector('meta[name="reactive"]')?.getAttribute('content')).toBe('value')
    })
  })
})
