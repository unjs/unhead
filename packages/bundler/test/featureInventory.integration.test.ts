import type { ClientUnhead } from 'unhead/client'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import { build, createLogger } from 'vite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Unhead } from '../src/unplugin/vite'

const coreDist = fileURLToPath(new URL('../../unhead/dist/', import.meta.url))
const paths = {
  'unhead': 'index.mjs',
  'unhead/client': 'client.mjs',
  'unhead/scripts': 'scripts.mjs',
}
const temporary: string[] = []
const app = `import { createHead } from 'unhead/client'
const head = createHead()
head.push({ title: 'Page' })
`
const appWithHead = app.replace('const head', 'export const head')

let dom: JSDOM

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html>')
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('document', dom.window.document)
  vi.stubGlobal('Event', dom.window.Event)
})

afterEach(async () => {
  dom.window.close()
  vi.unstubAllGlobals()
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function fixture(source: string) {
  const root = await mkdtemp(join(tmpdir(), 'unhead-features-'))
  temporary.push(root)
  const entry = join(root, 'entry.js')
  const output = join(root, 'out')
  await writeFile(entry, source)
  const config = {
    root,
    configFile: false as const,
    logLevel: 'silent' as const,
    resolve: {
      alias: Object.entries(paths).map(([id, file]) => ({ find: new RegExp(`^${id}$`), replacement: join(coreDist, file) })),
    },
    plugins: Unhead({ treeshake: { features: true }, devtools: false, validate: false }),
    build: {
      outDir: output,
      modulePreload: false as const,
      rollupOptions: {
        input: entry,
        output: { entryFileNames: '[name].mjs', chunkFileNames: '[name].mjs' },
      },
    },
  }
  async function run(revision = '') {
    const { head } = await import(/* @vite-ignore */ pathToFileURL(join(output, 'entry.mjs')).href + revision)
    return head as ClientUnhead
  }
  return { root, entry, config, run }
}

async function clientBytes(config: Parameters<typeof build>[0]) {
  const result = await build(config)
  if (Array.isArray(result) || !('output' in result))
    throw new Error('Expected a client bundle')
  return result.output.reduce((bytes, item) => bytes + (item.type === 'chunk' ? Buffer.byteLength(item.code) : 0), 0)
}

describe('feature inventory', () => {
  it('removes both unused client paths in a static app', async () => {
    const { config, run } = await fixture(app)
    const full = await clientBytes({ ...config, plugins: [] })
    const optimized = await clientBytes(config)
    expect(full - optimized).toBeGreaterThan(600)
    await run()
    expect(document.title).toBe('Page')
  })

  it('keeps features when entry exports are available to external consumers', async () => {
    const { config, run } = await fixture(appWithHead)
    await build({
      ...config,
      build: { ...config.build, rollupOptions: { ...config.build.rollupOptions, preserveEntrySignatures: 'strict' } },
    })
    const head = await run()
    const onresize = vi.fn()
    const entry = head.push({ title: 'Updated', titleTemplate: '%s | Site', bodyAttrs: { onresize } })
    expect(document.title).toBe('Updated | Site')
    window.dispatchEvent(new Event('resize'))
    expect(onresize).toHaveBeenCalledOnce()
    entry.dispose()
  })

  it('sees a title template used in a dynamic import', async () => {
    const { root, config, run } = await fixture(`import './head.js'; import('./route.js')`)
    await writeFile(join(root, 'head.js'), appWithHead)
    await writeFile(join(root, 'route.js'), `import { head } from './head.js'; head.push({ titleTemplate: '%s | Lazy' })`)
    await build(config)
    await run()
    await expect.poll(() => document.title).toBe('Page | Lazy')
  })

  it.each([
    { extra: '', expected: 'domEvents=absent, titleTemplate=absent' },
    { extra: '<script src="https://other.example/script.js"></script>', expected: 'domEvents=unknown, titleTemplate=unknown' },
  ])('accounts for executable HTML outside the client graph when $extra', async ({ extra, expected }) => {
    const { root, config } = await fixture(app)
    const html = join(root, 'index.html')
    await writeFile(html, `<!DOCTYPE html><script type="module" src="./entry.js"></script>${extra}`)
    const info = vi.fn()
    const logger = { ...createLogger('silent'), info }
    await build({
      ...config,
      customLogger: logger,
      build: { ...config.build, rollupOptions: { ...config.build.rollupOptions, input: html } },
    })
    expect(info.mock.calls.map(call => String(call[0])).find(message => message.includes('Unhead features'))).toContain(expected)
  })

  it('preserves both features for an opaque dependency', async () => {
    const { root, config, run } = await fixture(`import { configure } from 'head-extension'
${app}
configure(head)
`)
    const dependency = join(root, 'node_modules/head-extension')
    await mkdir(dependency, { recursive: true })
    await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: 'head-extension', type: 'module', exports: './index.js' }))
    await writeFile(join(dependency, 'index.js'), `export function configure(head) {
      head.push({ titleTemplate: '%s | Extension', bodyAttrs: { onresize: () => {
        document.body.dataset.resized = 'yes'
      } } })
    }`)
    await build(config)
    await run()
    expect(document.title).toBe('Page | Extension')
    window.dispatchEvent(new Event('resize'))
    expect(document.body.dataset.resized).toBe('yes')
  })

  it('stops before emitting output if a late entry changes the inventory', async () => {
    const { root, config } = await fixture('import \'./head.js\'')
    await writeFile(join(root, 'head.js'), appWithHead)
    const late = join(root, 'late.js')
    await writeFile(late, `import { head } from './head.js'; head.push({ titleTemplate: '%s | Late' })`)
    await expect(build({
      ...config,
      plugins: [...config.plugins, {
        name: 'late-entry',
        moduleParsed(module) {
          if (module.id === '\0unhead:build-features')
            this.emitFile({ type: 'chunk', id: late })
        },
      }],
    })).rejects.toThrow('A late client entry changed the Unhead feature inventory')
  })

  it('retains runtime support across a watch rebuild', async () => {
    const { entry, config, run } = await fixture(appWithHead)
    const watcher = await build({
      ...config,
      build: { ...config.build, watch: {}, rollupOptions: { ...config.build.rollupOptions, preserveEntrySignatures: 'strict' } },
    })
    if (Array.isArray(watcher) || !('on' in watcher))
      throw new Error('Expected a Vite watcher')
    const waitForBundle = () => new Promise<void>((resolve, reject) => {
      watcher.on('event', (event) => {
        if (event.code === 'ERROR')
          reject(event.error)
        if (event.code === 'BUNDLE_END')
          resolve()
      })
    })
    try {
      await waitForBundle()
      const previous = await run('?watch=1')
      const probe = previous.push({ titleTemplate: '%s | Watch' })
      expect(document.title).toBe('Page | Watch')
      probe.dispose()

      const rebuilt = waitForBundle()
      await writeFile(entry, `${appWithHead}\nhead.push({ title: 'Rebuilt', titleTemplate: '%s | Next' })`)
      await rebuilt
      const next = await run('?watch=2')
      const onresize = vi.fn()
      const listener = next.push({ bodyAttrs: { onresize } })
      expect(document.title).toBe('Rebuilt | Next')
      window.dispatchEvent(new Event('resize'))
      expect(onresize).toHaveBeenCalledOnce()
      listener.dispose()

      const removed = waitForBundle()
      await writeFile(entry, appWithHead)
      await removed
      const final = await run('?watch=3')
      const template = final.push({ titleTemplate: '%s | Still available' })
      expect(document.title).toBe('Page | Still available')
      template.dispose()
    }
    finally {
      await watcher.close()
    }
  })
})
