// @vitest-environment node
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'
import { Unhead } from '../src/vite'

let code: string
beforeAll(async () => {
  const core = resolve(__dirname, '../../unhead/src')
  const vue = resolve(__dirname, '../src')
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
      { find: /^unhead\/lazy$/, replacement: `${core}/lazy/index.ts` },
      { find: /^unhead\/client$/, replacement: `${core}/client/index.ts` },
      { find: /^unhead\/stream\/client$/, replacement: `${core}/stream/client.ts` },
      { find: /^unhead\/scripts$/, replacement: `${core}/scripts/index.ts` },
    ] },
    build: {
      write: false,
      minify: false,
      lib: { entry: resolve(__dirname, 'fixtures/lazy-navigation.ts'), name: 'NavigationFixture', formats: ['iife'] },
    },
  })
  const output = Array.isArray(result) ? result[0] : result
  if (!('output' in output))
    throw new Error('Expected one client build.')
  code = output.output.filter(chunk => chunk.type === 'chunk').map(chunk => chunk.code).join('\n')
})

describe('production Vue Vite streaming switch', () => {
  it.each(['before activation', 'after activation'] as const)('drops initial stream styles on navigation %s', async (timing) => {
    const dom = new JSDOM('<div id="app"><div>initial</div></div>', { runScripts: 'outside-only', url: 'https://example.test/' })
    const { window } = dom
    const frames: FrameRequestCallback[] = []
    window.requestAnimationFrame = callback => frames.push(callback)
    window.eval('window.__unhead__ = { _q: [], push(entries) { this._q.push(entries) } }')
    window.eval(code)
    const fixture = window as unknown as {
      NavigationFixture: { start: () => Promise<{ app: { unmount: () => void }, navigate: () => Promise<unknown>, abort: () => Promise<unknown> }> }
      __unhead__: { push: (entries: unknown[]) => void }
    }
    const client = await fixture.NavigationFixture.start()
    const styles = () => [...window.document.querySelectorAll('link[rel="stylesheet"]')].map(el => el.getAttribute('href'))
    try {
      fixture.__unhead__.push([{ link: [{ rel: 'stylesheet', href: '/initial-stream.css' }] }])
      if (timing === 'after activation') {
        frames.shift()!(0)
        await expect.poll(styles).toContain('/initial-stream.css')
        await client.abort()
        fixture.__unhead__.push([{ link: [{ rel: 'stylesheet', href: '/still-initial-stream.css' }] }])
        await expect.poll(styles).toContain('/still-initial-stream.css')
      }
      await client.navigate()
      fixture.__unhead__.push([{ link: [{ rel: 'stylesheet', href: '/late-initial-stream.css' }] }])
      if (timing === 'before activation')
        frames.shift()!(0)
      await expect.poll(styles).toEqual(['/destination.css'])
      fixture.__unhead__.push([{ link: [{ rel: 'stylesheet', href: '/later-initial-stream.css' }] }])
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(styles()).toEqual(['/destination.css'])
    }
    finally {
      client.app.unmount()
      window.close()
    }
  })
})
