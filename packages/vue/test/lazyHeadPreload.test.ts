import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
// @vitest-environment node
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Unhead as ReactUnhead } from '../../react/src/vite'
import { Unhead } from '../src/vite'

const root = resolve(__dirname, 'fixtures/lazy-preload')
const vue = resolve(__dirname, '../src')
const core = resolve(__dirname, '../../unhead/src')

async function buildPages(base = '/site/', lazyHeadPreload?: boolean, lazyHead = false) {
  const result = await build({
    root,
    base,
    configFile: false,
    logLevel: 'silent',
    plugins: Unhead({ lazyHead, lazyHeadPreload, devtools: false, validate: false }),
    resolve: {
      alias: [
        ...lazyHead ? [] : [{ find: /^@unhead\/vue\/(client|lazy)$/, replacement: `${vue}/$1.ts` }],
        { find: /^unhead\/(client|lazy)$/, replacement: `${core}/$1/index.ts` },
      ],
    },
    build: {
      write: false,
      rollupOptions: { input: { lazy: resolve(root, 'lazy.html'), eager: resolve(root, 'eager.html') } },
    },
  })
  if (!('output' in result))
    throw new Error('Expected one client build.')
  const output = result.output
  const links = (fileName: string) => {
    const asset = output.find(asset => asset.fileName === fileName)
    if (asset?.type !== 'asset')
      throw new Error(`Missing ${fileName}.`)
    const { window } = new JSDOM(String(asset.source))
    try {
      return [...window.document.querySelectorAll('link[rel="modulepreload"][fetchpriority="low"]')]
        .map(link => ({ href: link.getAttribute('href'), crossorigin: link.hasAttribute('crossorigin') }))
    }
    finally {
      window.close()
    }
  }
  return { output, lazy: links('lazy.html'), eager: links('eager.html') }
}

describe('lazy head preload', () => {
  beforeAll(() => vi.stubEnv('NODE_ENV', 'production'))
  afterAll(() => vi.unstubAllEnvs())

  it.each([true, false])('builds an eager React page with the published export map, lazy available: %s', async (lazyAvailable) => {
    const fixture = await mkdtemp(resolve(tmpdir(), 'unhead-react-preload-'))
    const react = resolve(fixture, 'node_modules/@unhead/react')
    const unhead = resolve(fixture, 'node_modules/unhead')
    try {
      await mkdir(resolve(react, 'dist'), { recursive: true })
      await mkdir(unhead, { recursive: true })
      await writeFile(resolve(react, 'package.json'), await readFile(resolve(__dirname, '../../react/package.json')))
      await writeFile(resolve(react, 'dist/client.mjs'), `export * from ${JSON.stringify(resolve(__dirname, '../../react/src/client.ts'))}`)
      await writeFile(resolve(unhead, 'package.json'), JSON.stringify({ name: 'unhead', type: 'module', exports: { './client': './client.mjs' } }))
      await writeFile(resolve(fixture, 'index.html'), '<title>Eager React</title><script type="module" src="./entry.ts"></script>')
      await writeFile(resolve(fixture, 'entry.ts'), 'import { createHead } from "@unhead/react/client"; createHead().push({ title: "Eager React" })')
      const result = await build({
        root: fixture,
        configFile: false,
        logLevel: 'silent',
        plugins: ReactUnhead({ devtools: false, validate: false }),
        resolve: { alias: [
          { find: 'unhead/client', replacement: `${core}/client/index.ts` },
          ...lazyAvailable ? [{ find: 'unhead/lazy', replacement: `${core}/lazy/index.ts` }] : [],
        ] },
        build: { write: false },
      })
      if (!('output' in result))
        throw new Error('Expected one client build.')
      const html = result.output.find(asset => asset.fileName === 'index.html')
      if (html?.type !== 'asset')
        throw new Error('Missing index.html.')
      const dom = new JSDOM(String(html.source))
      expect(dom.window.document.title).toBe('Eager React')
      expect(dom.window.document.querySelector('link[fetchpriority="low"]')).toBeNull()
      dom.window.close()
    }
    finally {
      await rm(fixture, { recursive: true, force: true })
    }
  })

  it.each(['/site/', '/store%20front/', './'])('hints only the deferred runtime with base %s', async (base) => {
    const { output, lazy, eager } = await buildPages(base)
    expect(lazy).toHaveLength(1)
    expect(lazy[0].crossorigin).toBe(true)
    const site = new URL(base, 'https://example.test/')
    const request = new URL(lazy[0].href!, site)
    const lazyEntry = output.find(chunk => chunk.type === 'chunk' && chunk.facadeModuleId === resolve(root, 'lazy.html'))
    if (lazyEntry?.type !== 'chunk')
      throw new Error('Missing the lazy HTML entry.')
    expect(lazyEntry.dynamicImports.map(file => new URL(file, site).href)).toContain(request.href)
    expect(eager).toEqual([])
  })

  it('hints the renderer when the Vite build switch replaces the normal client factory', async () => {
    const { eager } = await buildPages('/site/', true, true)
    expect(eager).toHaveLength(1)
  })

  it('leaves the deferred runtime unhinted when preload is disabled', async () => {
    const { lazy } = await buildPages('/site/', false)
    expect(lazy).toEqual([])
  })
})
