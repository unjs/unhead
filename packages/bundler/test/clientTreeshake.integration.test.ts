import type { VitePluginOptions } from '../src/unplugin/types'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/unplugin/vite'

const dist = fileURLToPath(new URL('../../unhead/dist/', import.meta.url))
const client = `import { createHead } from 'unhead/client'
import { useHead } from 'unhead'
const head = createHead()
useHead(head, { title: 'Page' })`
const detect = { client: true }

async function bundle(source: string, treeshake?: VitePluginOptions['treeshake'], target: 'client' | 'server' | 'stream' = 'client', vendor?: string) {
  const root = await mkdtemp(join(tmpdir(), 'unhead-buffered-'))
  try {
    const entry = join(root, 'entry.mjs')
    await writeFile(entry, source)
    if (vendor) {
      const dependency = join(root, 'node_modules/head-extension')
      await mkdir(dependency, { recursive: true })
      await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: 'head-extension', type: 'module', exports: './index.js' }))
      await writeFile(join(dependency, 'index.js'), vendor)
    }
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      resolve: {
        alias: {
          'unhead/client': join(dist, 'client.mjs'),
          'unhead/scripts': join(dist, 'scripts.mjs'),
          'unhead/server': join(dist, 'server.mjs'),
          'unhead': join(dist, 'index.mjs'),
        },
      },
      plugins: [
        ...Unhead({ treeshake, devtools: false, validate: false }),
        target === 'stream' && { name: 'nuxt:streaming-iife-chunk' },
      ],
      build: {
        write: false,
        ssr: target === 'server' ? entry : false,
        rollupOptions: { input: entry, output: { format: 'iife', inlineDynamicImports: true } },
      },
    })
    if (Array.isArray(result) || !('output' in result) || result.output[0]?.type !== 'chunk')
      throw new Error('Expected one entry bundle')
    return result.output[0].code
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
}

async function run(code: string, check: (window: Window & typeof globalThis) => void | Promise<void>) {
  const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'outside-only' })
  try {
    dom.window.eval(code)
    await check(dom.window as unknown as Window & typeof globalThis)
  }
  finally {
    dom.window.close()
  }
}

describe('buffered client tree-shaking', () => {
  it('shrinks the normal client import and still renders plain titles', async () => {
    const full = await bundle(client)
    const trimmed = await bundle(client, detect)

    expect(gzipSync(full).length - gzipSync(trimmed).length).toBeGreaterThan(200)
    await run(trimmed, (window) => {
      expect(window.document.title).toBe('Page')
    })
  })

  it('keeps a static title template and lets useScript install its own listener', async () => {
    const code = await bundle(`import { useScript } from 'unhead/scripts'
${client}
useHead(head, { titleTemplate: '%s | Site' })
const script = useScript(head, '/fixture.js', { trigger: 'manual' })
script.onLoaded(() => { document.body.dataset.loaded = 'yes' })
script.load()`, detect)

    await run(code, async (window) => {
      expect(window.document.title).toBe('Page | Site')
      window.document.querySelector('script[src="/fixture.js"]')!.dispatchEvent(new window.Event('load'))
      await expect.poll(() => window.document.body.dataset.loaded).toBe('yes')
    })
  })

  it('sees useHead in a lazy vendor dependency', async () => {
    const code = await bundle(`${client}
import('head-extension').then(({ configure }) => configure(head))`, detect, 'client', `
import { useHead as setHead } from 'unhead'
export function configure(head) {
  setHead(head, { titleTemplate: '%s | Vendor', bodyAttrs: {
    onresize: () => { document.body.dataset.resized = 'yes' },
  } })
}`)

    await run(code, async (window) => {
      await expect.poll(() => window.document.title).toBe('Page | Vendor')
      window.dispatchEvent(new window.Event('resize'))
      expect(window.document.body.dataset.resized).toBe('yes')
    })
  })

  it('ignores dynamic keys in useHead inputs', async () => {
    const code = await bundle(`${client}
const key = ['title', 'Template'].join('')
useHead(head, { [key]: '%s | Dynamic' })`, detect)

    await run(code, (window) => {
      expect(window.document.title).toBe('Page')
    })
  })

  it('retains title templates and listeners when Nuxt streaming is active', async () => {
    const code = await bundle(`${client}
head.push({ titleTemplate: '%s | Site', bodyAttrs: {
  onresize: () => { document.body.dataset.resized = 'yes' },
} })`, detect, 'stream')

    await run(code, (window) => {
      expect(window.document.title).toBe('Page | Site')
      window.dispatchEvent(new window.Event('resize'))
      expect(window.document.body.dataset.resized).toBe('yes')
    })
  })

  it('keeps server title templates when the client opts out', async () => {
    const code = await bundle(`import { createHead } from 'unhead/server'
const head = createHead()
head.push({ title: 'Server', titleTemplate: '%s | Site' })
document.head.insertAdjacentHTML('beforeend', head.render().headTags)`, detect, 'server')

    await run(code, (window) => {
      expect(window.document.title).toBe('Server | Site')
    })
  })
})
