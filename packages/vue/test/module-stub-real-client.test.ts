import { createHead } from '@unhead/vue/client'
import { JSDOM } from 'jsdom'
import { createStreamingPlugin, VIRTUAL_CLIENT_ID } from 'unhead/stream/unplugin'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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

/**
 * Runs the module-mode stub the plugin emits against Vue's REAL client head,
 * which renders on a debounce rather than synchronously.
 */
function runStub(queued: any[][] = []) {
  const dom = new JSDOM('<!DOCTYPE html><html><head><title>Initial</title></head><body></body></html>')
  const win = dom.window as any
  win.__unhead__ = {
    _q: [...queued] as any[],
    push(entries: any) {
      this._q.push(entries)
    },
  }
  globalThis.window = win
  globalThis.document = win.document

  const plugin = createStreamingPlugin.vite({ framework: '@unhead/vue', mode: 'module' }) as any
  const hook = plugin.load
  const loaded = typeof hook === 'function' ? hook.call({}, `\0${VIRTUAL_CLIENT_ID}`) : hook.handler.call({}, `\0${VIRTUAL_CLIENT_ID}`)
  const body = loaded.code.split('\n').filter((line: string) => !line.startsWith('import')).join('\n')
  // eslint-disable-next-line no-new-func
  new Function('createHead', 'window', 'document', 'console', body)(createHead, win, win.document, console)
  return win
}

function settle() {
  return new Promise(resolve => setTimeout(resolve, 30))
}

describe('module stub against the real Vue client head', () => {
  it('applies a queued batch through the debounced renderer', async () => {
    const win = runStub()
    win.__unhead__.push([
      { title: 'Streamed' },
      { meta: [{ name: 'description', content: 'Streamed description' }] },
    ])
    await settle()

    expect(win.document.title).toBe('Streamed')
    expect(win.document.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('Streamed description')
  })

  it('applies a batch queued before the stub ran', async () => {
    const win = runStub([
      [{ title: 'Queued' }, { meta: [{ name: 'description', content: 'Queued description' }] }],
    ])
    await settle()

    expect(win.document.title).toBe('Queued')
    expect(win.document.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('Queued description')
  })

  it('marks replayed entries as streamed', async () => {
    const win = runStub([[{ title: 'Queued' }, { meta: [{ name: 'a', content: '1' }] }]])
    await settle()

    const entries = [...win.__unhead__._head.entries.values()]
    expect(entries.map((e: any) => e._streamed)).toEqual([true, true])
  })

  it('never emits a tag named after a batch index', async () => {
    const win = runStub()
    win.__unhead__.push([{ meta: [{ name: 'a', content: '1' }] }, { meta: [{ name: 'b', content: '2' }] }])
    await settle()

    expect(win.document.head.innerHTML).not.toMatch(/<0|<1/)
    expect(win.document.querySelectorAll('meta[name="a"], meta[name="b"]')).toHaveLength(2)
  })

  it('marks the entries as streamed for devtools', async () => {
    const win = runStub()
    win.__unhead__.push([{ title: 'Streamed' }])
    await settle()

    const entries = [...win.__unhead__._head.entries.values()]
    expect(entries.map((e: any) => e._streamed)).toEqual([true])
  })
})
