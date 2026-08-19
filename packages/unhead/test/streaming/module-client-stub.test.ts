import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createStreamingPlugin, VIRTUAL_CLIENT_ID } from '../../src/stream/unplugin'

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

function setupDom(streamKey = '__unhead__') {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  const win = dom.window as any
  win[streamKey] = {
    _q: [] as any[],
    push(entries: any) {
      this._q.push(entries)
    },
  }
  globalThis.window = win
  globalThis.document = win.document
  return win
}

const RESOLVED_CLIENT_ID = `\0${VIRTUAL_CLIENT_ID}`

/**
 * Runs the emitted client stub against a real client head. The `import` line
 * is stripped and `createHead` handed in, so the rest of the stub body is
 * exercised exactly as the browser would run it.
 */
function runStub(streamKey = '__unhead__') {
  const plugin = createStreamingPlugin.vite({ framework: '@unhead/test', mode: 'module', streamKey }) as any
  const hook = plugin.load
  const loaded = typeof hook === 'function' ? hook.call({}, RESOLVED_CLIENT_ID) : hook.handler.call({}, RESOLVED_CLIENT_ID)
  const body = loaded.code.split('\n').filter((line: string) => !line.startsWith('import')).join('\n')
  // eslint-disable-next-line no-new-func
  return new Function('createHead', 'window', 'document', 'console', body)(createHead, globalThis.window, globalThis.document, console)
}

function settle() {
  return new Promise(resolve => setTimeout(resolve, 20))
}

describe('module-mode client stub', () => {
  it('applies a batch queued before the client loaded', async () => {
    const win = setupDom()
    win.__unhead__.push([
      { title: 'Streamed' },
      { meta: [{ name: 'description', content: 'Streamed description' }] },
    ])

    runStub()
    await settle()

    expect(globalThis.document.title).toBe('Streamed')
    expect(globalThis.document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Streamed description')
  })

  it('applies a batch that arrives after the client loaded', async () => {
    const win = setupDom()

    runStub()
    win.__unhead__.push([
      { link: [{ rel: 'canonical', href: 'https://example.com/' }] },
      { script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' }] },
    ])
    await settle()

    expect(globalThis.document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com/')
    expect(globalThis.document.querySelector('script[type="application/ld+json"]')).toBeTruthy()
  })

  it('never emits a tag named after a batch index', async () => {
    const win = setupDom()

    runStub()
    win.__unhead__.push([{ meta: [{ name: 'a', content: '1' }] }, { meta: [{ name: 'b', content: '2' }] }])
    await settle()

    expect(globalThis.document.head.innerHTML).not.toMatch(/<0|<1/)
    expect(globalThis.globalThis.document.querySelectorAll('meta[name="a"], meta[name="b"]')).toHaveLength(2)
  })

  it('exposes the head instance for the framework client to adopt', async () => {
    const win = setupDom()
    runStub()
    expect(win.__unhead__._head).toBeDefined()
  })
})
