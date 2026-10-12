import type * as VaporFixture from './fixtures/vapor/entry'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc-vapor'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const fixture = resolve(import.meta.dirname, 'fixtures/vapor/entry.ts')
const vue = require.resolve('vue-vapor/dist/vue.runtime-with-vapor.esm-browser.js')
let bundle: string

beforeAll(async () => {
  const result = await build({
    entryPoints: [fixture],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'VaporFixture',
    platform: 'browser',
    alias: { 'vue': vue, 'vue-vapor': vue },
    plugins: [{
      name: 'vapor-sfc',
      setup(build) {
        build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
          // Compile the fixture as input, then assert on its rendered DOM.
          // eslint-disable-next-line harlanzw/no-test-file-reads
          const source = await readFile(path, 'utf8')
          const { descriptor, errors } = parse(source, { filename: path })
          if (errors.length)
            throw errors[0]
          const { content } = compileScript(descriptor, { id: 'vapor-child', inlineTemplate: true })
          return { contents: content, loader: 'ts', resolveDir: dirname(path) }
        })
      },
    }],
  })
  bundle = result.outputFiles[0].text
})

describe('vapor component head lifecycle', () => {
  it.each(['sfc', 'component'] as const)('cleans up %s head tags on unmount and remount', async (kind) => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.com',
    })
    const runtime = dom.window.eval(`${bundle}\nVaporFixture;`) as typeof VaporFixture
    const app = runtime.mount(kind)
    const document = dom.window.document

    try {
      await app.flush()
      expect(document.querySelector('[data-vapor-child]')).not.toBeNull()
      expect(document.title).toBe('child')
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')

      app.setTitle('updated child')
      await app.flush()
      expect(document.title).toBe('updated child')

      app.setVisible(false)
      await app.flush()
      expect(document.querySelector('[data-vapor-child]')).toBeNull()
      expect(document.title).toBe('parent')
      expect(document.querySelector('meta[name="robots"]')).toBeNull()

      app.setTitle('remounted child')
      app.setVisible(true)
      await app.flush()
      expect(document.querySelector('[data-vapor-child]')).not.toBeNull()
      expect(document.title).toBe('remounted child')
      expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1)

      app.setVisible(false)
      await app.flush()
      expect(document.title).toBe('parent')
      expect(document.querySelector('meta[name="robots"]')).toBeNull()
    }
    finally {
      app.unmount()
      dom.window.close()
    }
  })
})

describe('vapor script consumer lifecycle', () => {
  it.each([
    [false, 'load', false],
    [false, 'error', false],
    [true, 'load', false],
    [true, 'error', false],
    [false, 'load', true],
    [false, 'error', true],
  ] as const)('releases scope=%s consumers before %s, registration after setup=%s', async (scoped, event, late) => {
    const dom = new JSDOM('<div id="app"></div>', {
      runScripts: 'outside-only',
      url: 'https://example.com',
    })
    const runtime = dom.window.eval(`${bundle}\nVaporFixture;`) as typeof VaporFixture
    const warn = vi.spyOn(dom.window.console, 'warn')
    const app = runtime.mountScript(scoped, late)
    const document = dom.window.document
    try {
      await app.flush()
      const script = document.querySelector('script[src="/vapor-shared.js"]')!
      expect(script).not.toBeNull()
      if (late)
        app.registerChild()
      app.setVisible(false)
      await app.flush()
      expect(document.querySelector('#app p')).toBeNull()
      if (scoped)
        expect(app.consumerAborted).toBe(true)
      expect(app.parentAborted).toBe(false)
      expect(document.querySelector('script[src="/vapor-shared.js"]')).toBe(script)
      // Registration through a retained handle must also respect its stopped owner.
      app.registerChild()
      script.dispatchEvent(new dom.window.Event(event))
      await app.flush()
      expect(app.calls.childLoaded).toBe(0)
      expect(app.calls.childError).toBe(0)
      expect(app.calls.parentLoaded).toBe(event === 'load' ? 1 : 0)
      expect(app.calls.parentError).toBe(event === 'error' ? 1 : 0)
      expect(warn).not.toHaveBeenCalled()
    }
    finally {
      app.unmount()
      warn.mockRestore()
      dom.window.close()
    }
  })
})
