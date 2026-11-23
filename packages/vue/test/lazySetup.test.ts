// @vitest-environment node
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/vite'

async function buildFixture(aliased: boolean, fixture = 'lazy-setup.ts') {
  const vue = resolve(__dirname, '../src')
  const core = resolve(__dirname, '../../unhead/src')
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      ...Unhead({ lazyHead: true, streaming: true, devtools: false, validate: false }),
      {
        name: 'fixture-source-entries',
        resolveId(id) {
          if (id === '@unhead/vue/stream/client')
            return `${vue}/stream/client.ts`
          if (id === '@unhead/vue/client' || id === '@unhead/vue/lazy')
            return `${vue}/${id.split('/').pop()}.ts`
        },
      },
    ],
    resolve: { alias: [
      ...aliased ? [{ find: '@unhead/vue/stream/client', replacement: `${vue}/stream/client.ts` }] : [],
      { find: /^unhead\/(lazy|client|scripts)$/, replacement: `${core}/$1/index.ts` },
      { find: 'unhead/stream/client', replacement: `${core}/stream/client.ts` },
    ] },
    build: {
      write: false,
      minify: false,
      lib: { entry: resolve(__dirname, 'fixtures', fixture), name: 'SetupFixture', formats: ['iife'] },
    },
  })
  const output = Array.isArray(result) ? result[0] : result
  if (!('output' in output))
    throw new Error('Expected one client build.')
  return output.output.filter(chunk => chunk.type === 'chunk').map(chunk => chunk.code).join('\n')
}

describe('production Vue setup', () => {
  it.each([false, true])('renders safely immediately after mounting, streaming: %s', async (streaming) => {
    const code = await buildFixture(false)
    const { window } = new JSDOM('<title>Server</title><div id="app"><div>ready</div></div>', { runScripts: 'outside-only' })
    const frames: FrameRequestCallback[] = []
    window.requestAnimationFrame = callback => frames.push(callback)
    if (streaming)
      window.eval('window.__unhead__ = { _q: [], push(entries) { this._q.push(entries) } }')
    let client: { rendered: boolean, render: () => boolean, update: () => void, unmount: () => void } | undefined
    try {
      window.eval(code)
      const fixture = window as unknown as { SetupFixture: { start: (streaming: boolean, subscribe: boolean, supplied: boolean, renderImmediately: boolean) => NonNullable<typeof client> } }
      client = fixture.SetupFixture.start(streaming, false, false, true)
      expect(client.rendered).toBe(false)
      expect(window.document.title).toBe('Server')
      frames.shift()!(0)
      await expect.poll(() => window.document.title).toBe('Hydrated title')
      client.update()
      expect(client.render()).toBe(false)
      await expect.poll(() => window.document.title).toBe('Updated title')
    }
    finally {
      client?.unmount()
      window.close()
    }
  })

  it.each([false, true])('settles an awaited script when runtime plugins reject, streaming: %s', async (streaming) => {
    const code = await buildFixture(false, 'lazy-suspense-script.ts')
    const { window } = new JSDOM('<div id="app"><div>ready</div></div>', { runScripts: 'outside-only' })
    window.requestAnimationFrame = () => 0
    if (streaming)
      window.eval('window.__unhead__ = { _q: [], push(entries) { this._q.push(entries) } }')
    let client: { state: { resolved: boolean, status: string, error: string, result: unknown, repeated: unknown }, unmount: () => void } | undefined
    try {
      window.eval(code)
      const fixture = window as unknown as { SetupFixture: { start: (streaming: boolean, rejectRuntime: boolean) => NonNullable<typeof client> } }
      client = fixture.SetupFixture.start(streaming, true)
      await expect.poll(() => client!.state.resolved).toBe(true)
      expect(client.state.status).toBe('error')
      expect(client.state.error).toBe('Runtime plugin failed')
      expect(client.state.result).toBe(false)
      expect(client.state.repeated).toBe(false)
      expect(window.document.querySelector('#app')?.textContent).toBe('ready')
      expect(window.document.querySelector('script[src="/setup.js"]')).toBeNull()
    }
    finally {
      client?.unmount()
      window.close()
    }
  })

  it.each([false, true])('loads an awaited script while root Suspense hydration is pending, streaming: %s', async (streaming) => {
    const code = await buildFixture(false, 'lazy-suspense-script.ts')
    const dom = new JSDOM('<title>Server</title><div id="app"><div>ready</div></div>', { runScripts: 'outside-only' })
    const { window } = dom
    const frames: FrameRequestCallback[] = []
    window.requestAnimationFrame = callback => frames.push(callback)
    if (streaming)
      window.eval('window.__unhead__ = { _q: [], push(entries) { this._q.push(entries) } }')
    let client: { resolved: boolean, unmount: () => void } | undefined
    try {
      window.eval(code)
      const fixture = window as unknown as { SetupFixture: { start: (streaming: boolean) => NonNullable<typeof client> } }
      client = fixture.SetupFixture.start(streaming)
      await expect.poll(() => window.document.querySelector('script[src="/setup.js"]')).not.toBeNull()
      expect(client.resolved).toBe(false)
      window.document.querySelector('script[src="/setup.js"]')!.dispatchEvent(new window.Event('load'))
      await expect.poll(() => client!.resolved).toBe(true)
      expect(window.document.querySelector('#app')?.textContent).toBe('ready')
    }
    finally {
      client?.unmount()
      window.close()
    }
  })

  it.each([
    { aliased: true, streaming: true, subscribe: false, supplied: false },
    { aliased: false, streaming: false, subscribe: true, supplied: false },
    { aliased: false, streaming: true, subscribe: true, supplied: true },
  ])('replays entries and setup hooks: %j', async ({ aliased, streaming, subscribe, supplied }) => {
    const code = await buildFixture(aliased)
    const dom = new JSDOM('<div id="app"><div>ready</div></div>', { runScripts: 'outside-only' })
    const { window } = dom
    const frames: FrameRequestCallback[] = []
    window.requestAnimationFrame = callback => frames.push(callback)
    if (streaming)
      window.eval('window.__unhead__ = { _q: [[{ title: "Streamed title" }]], push(entries) { this._q.push(entries) } }')
    let client: { updates: string[], update: () => void, unsubscribe?: () => void, unmount: () => void } | undefined
    try {
      window.eval(code)
      const fixture = window as unknown as { SetupFixture: { start: (streaming: boolean, subscribe: boolean, supplied: boolean) => NonNullable<typeof client> } }
      client = fixture.SetupFixture.start(streaming, subscribe, supplied)
      frames.shift()!(0)
      await expect.poll(() => window.document.title).toBe(streaming ? 'Streamed title' : 'Hydrated title')
      if (subscribe) {
        expect(client.updates).toContain('setup')
        client.update()
        expect(client.updates.filter(update => update === 'setup')).toEqual(['setup'])
        client.unsubscribe!()
        client.update()
        expect(client.updates).not.toContain('setup')
      }
      if (supplied)
        expect(client.updates).toContain('supplied')
    }
    finally {
      client?.unmount()
      window.close()
    }
  })
})
