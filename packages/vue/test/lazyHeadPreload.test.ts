// @vitest-environment node
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Unhead } from '../src/vite'

const root = resolve(__dirname, 'fixtures/lazy-preload')
const vue = resolve(__dirname, '../src')
const core = resolve(__dirname, '../../unhead/src')

async function buildPages(base = '/site/', lazyHeadPreload?: boolean) {
  const result = await build({
    root,
    base,
    configFile: false,
    logLevel: 'silent',
    plugins: Unhead({ lazyHeadPreload, devtools: false, validate: false }),
    resolve: {
      alias: [
        { find: /^@unhead\/vue\/(client|lazy)$/, replacement: `${vue}/$1.ts` },
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

  it('leaves the deferred runtime unhinted when preload is disabled', async () => {
    const { lazy } = await buildPages('/site/', false)
    expect(lazy).toEqual([])
  })
})
