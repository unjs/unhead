import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import { JSDOM, VirtualConsole } from 'jsdom'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildFixture } from './fixtures/attribute-input/build'
import { descriptors, renderFixture, sharedInput } from './fixtures/attribute-input/server'

const requests = [
  { nonce: 'first&"nonce', baseURL: 'https://first.test/app/?a=1&b=2' },
  { nonce: 'second&"nonce', baseURL: 'https://second.test/other/?c=3&d=4' },
]
let outDir: string
let client: string

beforeAll(async () => {
  outDir = process.env.UNHEAD_ATTRIBUTE_FIXTURE_DIR || await mkdtemp(resolve(tmpdir(), 'unhead-vue-attrs-'))
  await buildFixture(outDir)
  client = await readFile(resolve(outDir, 'client.js'), 'utf8')
  if (process.env.UNHEAD_ATTRIBUTE_FIXTURE_DIR) {
    const html = await renderFixture({ nonce: 'browser&nonce', baseURL: 'http://127.0.0.1:4179/' })
    await writeFile(resolve(outDir, 'index.html'), html.replace('</body>', '<script src="/client.js"></script></body>'))
    await mkdir(resolve(outDir, 'assets'), { recursive: true })
    await writeFile(resolve(outDir, 'assets/entry.js'), 'export {}\n')
  }
}, 30_000)

afterAll(async () => {
  if (outDir && !process.env.UNHEAD_ATTRIBUTE_FIXTURE_DIR)
    await rm(outDir, { recursive: true, force: true })
})

describe('vue attribute input integration', () => {
  it('accepts literal attributes through the public Vue head API', () => {
    const head = createHead({ disableDefaults: true })
    head.push({
      script: [{
        attrs: {
          id: 'module',
          type: 'module',
          src: '/entry.js?first=1&literal=&amp;',
          tagPosition: 'literal-position',
        },
        tagPosition: 'bodyOpen',
      }],
    })
    const rendered = renderSSRHead(head)
    const dom = new JSDOM(`<html><head>${rendered.headTags}</head><body>${rendered.bodyTagsOpen}</body></html>`)
    const { document } = dom.window
    const module = document.querySelector('#module')
    expect(module?.getAttribute('src')).toBe('/entry.js?first=1&literal=&amp;')
    expect(module?.getAttribute('tagposition')).toBe('literal-position')
    expect(document.body.firstElementChild).toBe(module)
    dom.window.close()
  })

  it('renders separate requests from shared frozen descriptors', async () => {
    const originalInput = JSON.stringify(sharedInput)
    const originalDescriptors = JSON.stringify(descriptors)
    const documents = await Promise.all(requests.map(async (request) => {
      const observed: Record<string, unknown>[] = []
      const html = await renderFixture(request, props => observed.push(props))
      const dom = new JSDOM(html)
      const { document } = dom.window
      const module = document.querySelector('#fixture-module')!
      const expectedURL = new URL('/assets/entry.js?first=1&literal=&amp;', request.baseURL).href
      expect(module.getAttribute('src')).toBe(expectedURL)
      expect(module.getAttribute('nonce')).toBe(request.nonce)
      expect(module.getAttribute('tagposition')).toBe('literal-position')
      expect(module.getAttribute('tagpriority')).toBe('literal-priority')
      expect(module.getAttribute('class')).toBe('first  second')
      expect(module.getAttribute('style')).toBe('--url: url(https://example.test/a;b);  color: red')
      expect(document.querySelector('#fixture-preload')?.getAttribute('href')).toBe(expectedURL)
      expect(document.querySelector('#fixture-preload')?.hasAttribute('crossorigin')).toBe(true)
      expect(document.querySelector('base')?.getAttribute('href')).toBe(request.baseURL)
      expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Home & Vue')
      expect(document.querySelector('#app h1')?.textContent).toBe('Home')
      expect(document.body.firstElementChild?.id).toBe('body-open')
      expect(document.querySelector('#body-close')?.previousElementSibling?.id).toBe('app')
      expect(document.querySelector('#component-data')?.getAttribute('innerhtml')).toBe('literal-content-attribute')
      expect(observed).toEqual([expect.objectContaining({
        src: '/assets/entry.js?first=1&literal=&amp;',
        nonce: 'replace-me',
        tagposition: 'literal-position',
      })])
      return dom
    }))
    expect(JSON.stringify(sharedInput)).toBe(originalInput)
    expect(JSON.stringify(descriptors)).toBe(originalDescriptors)
    documents.forEach(dom => dom.window.close())
  })

  it('hydrates the Vite client and updates Vue state without replacing tags', async () => {
    const errors: unknown[] = []
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('jsdomError', error => errors.push(error))
    virtualConsole.on('error', error => errors.push(error))
    virtualConsole.on('warn', warning => errors.push(warning))
    const dom = new JSDOM(await renderFixture(requests[0]!), { runScripts: 'outside-only', virtualConsole })
    try {
      const { document } = dom.window
      const selectors = ['#fixture-module', '#fixture-preload', '#body-open', '#body-close', '#component-data', 'meta[name="description"]']
      const nodes = selectors.map(selector => document.querySelector(selector))
      const originalApp = document.querySelector('#app main')
      dom.window.eval(client)
      await expect.poll(() => document.querySelector('#component-data')?.getAttribute('data-route')).toBe('Home&literal=&amp;')
      await new Promise(resolve => dom.window.setTimeout(resolve, 10))
      selectors.forEach((selector, i) => expect(document.querySelector(selector)).toBe(nodes[i]))
      expect(document.querySelector('#app main')).toBe(originalApp)
      expect(document.querySelector('#fixture-module')?.getAttribute('nonce')).toBe(requests[0]!.nonce)
      expect(document.querySelector('#fixture-module')?.getAttribute('class')).toBe('first  second')
      expect(document.querySelector('#fixture-module')?.getAttribute('style')).toBe('--url: url(https://example.test/a;b);  color: red')

      expect(errors).toEqual([])
      document.querySelector<HTMLButtonElement>('#navigate')!.click()
      await expect.poll(() => document.title).toBe('About')
      expect(document.querySelector('#app h1')?.textContent).toBe('About')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('About & Vue')
      expect(document.querySelector('#component-data')?.getAttribute('data-route')).toBe('About&literal=&amp;')
      expect(JSON.parse(document.querySelector('#component-data')!.textContent!)).toEqual({ route: 'About' })
      selectors.forEach((selector, i) => {
        expect(document.querySelectorAll(selector)).toHaveLength(1)
        expect(document.querySelector(selector)).toBe(nodes[i])
      })
      expect(errors).toEqual([])
    }
    finally {
      dom.window.close()
    }
  })
})
