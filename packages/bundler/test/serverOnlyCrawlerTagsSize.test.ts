import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/unplugin/vite'

const fixtureDir = fileURLToPath(new URL('./fixtures/vite-build', import.meta.url))
const entry = fileURLToPath(new URL('./fixtures/vite-build/core-client.ts', import.meta.url))
const unheadSrc = fileURLToPath(new URL('../../unhead/src', import.meta.url))
const CRAWLER_MODULE_RE = /[\\/]utils[\\/]crawler\.ts$/

/** Replaces the crawler tag predicates with stubs of another size. */
const stubCrawlerModule: Plugin = {
  name: 'stub-crawler-module',
  enforce: 'pre',
  load(id) {
    if (CRAWLER_MODULE_RE.test(id))
      return 'export const isCrawlerMetaKey = () => 0\nexport const isCrawlerTag = () => 0\n'
  },
}

/** The gzip size of a minified client build of `createHead()` from `unhead/client`. */
async function clientSize(plugins: Plugin[]): Promise<number> {
  const result = await build({
    root: fixtureDir,
    configFile: false,
    logLevel: 'silent',
    plugins,
    resolve: {
      alias: [
        { find: /^unhead\/(client|plugins|utils)$/, replacement: `${unheadSrc}/$1/index.ts` },
        { find: /^unhead$/, replacement: `${unheadSrc}/index.ts` },
      ],
    },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ['es'], fileName: 'core-client' },
    },
  }) as any
  const code = [result].flat().flatMap((o: any) => o.output).filter((c: any) => c.type === 'chunk').map((c: any) => c.code).join('\n')
  return gzipSync(code).length
}

describe('serverOnlyCrawlerTags bundle size', () => {
  it('costs the core client nothing with the option off', async () => {
    const off = await clientSize(Unhead({ devtools: false }) as Plugin[])
    // The core client never reaches the crawler tag predicates, so stubbing them changes nothing.
    expect(await clientSize([...Unhead({ devtools: false }) as Plugin[], stubCrawlerModule])).toBe(off)
    // Without the plugin the build is the same size.
    expect(await clientSize([])).toBe(off)
    // With the option on, the client head carries the crawler tag plugin.
    expect(await clientSize(Unhead({ devtools: false, serverOnlyCrawlerTags: true }) as Plugin[])).toBeGreaterThan(off)
  }, 60_000)
})
