// @vitest-environment jsdom
import type { ViteDevServer } from 'vite'
import type { LazyAppName } from './fixtures/lazy-app'
import { resolve } from 'node:path'
import { runInThisContext } from 'node:vm'
import { createComponent } from 'solid-js'
import { hydrate } from 'solid-js/web'
import { createServer } from 'vite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead as createLazyHead, UnheadContext } from '../src/lazy'
import config from '../vitest.config'
import { createFixture } from './fixtures/lazy-app'

let server: ViteDevServer
let renderApp: typeof import('./fixtures/lazy-ssr').renderApp

// The server half runs through a Vite SSR server, so Solid and the composables use their
// server builds there, as in a real app. The test file itself runs the client builds.
beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: resolve(__dirname, '..'),
    logLevel: 'silent',
    appType: 'custom',
    resolve: { alias: config.resolve!.alias },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  })
  ;({ renderApp } = await server.ssrLoadModule(resolve(__dirname, 'fixtures/lazy-ssr.ts')))
})
afterAll(() => server?.close())

let disposers: (() => void)[] = []

function serverRender(name: LazyAppName) {
  const { html, headTags, hydrationScript } = renderApp(name)
  document.head.innerHTML = headTags
  document.body.innerHTML = `<div id="app">${html}</div>`
  const template = document.createElement('template')
  template.innerHTML = hydrationScript
  // Run Solid's generated fixture script in the same context as hydrate().
  runInThisContext(template.content.querySelector('script')!.text)
}

function hydrateApp(name: LazyAppName, head = createLazyHead()) {
  const fixture = createFixture()
  const App = fixture.apps[name]
  disposers.push(hydrate(() => createComponent(UnheadContext.Provider, {
    value: head,
    get children() {
      return createComponent(App, {})
    },
  }), document.getElementById('app')!))
  return { head, ...fixture }
}

const settle = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
})
afterEach(async () => {
  disposers.forEach(d => d())
  disposers = []
  // a loaded head renders the disposal on a timer, so let it finish before the next test
  await settle()
  delete (globalThis as any)._$HY
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('solid lazy head', () => {
  it('hydrates the server element and leaves the server head alone', async () => {
    serverRender('Home')
    const element = document.getElementById('home')
    expect(element?.hasAttribute('data-hk')).toBe(true)
    const nodes = [...document.head.children]
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    hydrateApp('Home', head)
    head.finishHydration()
    await settle()
    expect(load).not.toHaveBeenCalled()
    expect(document.getElementById('home')).toBe(element)
    expect(document.title).toBe('Home')

    await head.load()
    await settle()
    expect([...document.head.children]).toEqual(nodes)
  })

  it('a push from the client entry before hydration counts as server rendered', async () => {
    serverRender('Home')
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    head.push({ meta: [{ name: 'description', content: 'desc' }] })
    hydrateApp('Home', head)
    head.finishHydration()
    await settle()
    expect(load).not.toHaveBeenCalled()
  })

  it('queues a signal change until activation', async () => {
    serverRender('Signal')
    const { head, setTitle } = hydrateApp('Signal')
    const load = vi.spyOn(head, 'load')
    head.finishHydration()
    await settle()
    expect(load).not.toHaveBeenCalled()

    setTitle('Two')
    expect(document.title).toBe('One')
    await head.load()
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  it('queues a push in onMount before hydration ends', async () => {
    serverRender('MountPush')
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    hydrateApp('MountPush', head)
    expect(load).not.toHaveBeenCalled()
    head.finishHydration()
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="mounted"]')?.getAttribute('content')).toBe('yes'))
  })

  it('a component shown after mount waits for activation', async () => {
    serverRender('ShowAfterMount')
    expect(document.getElementById('client-child')).toBeNull()
    const { head } = hydrateApp('ShowAfterMount')
    head.finishHydration()
    expect(document.querySelector('meta[name="client-child"]')).toBeNull()
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="client-child"]')?.getAttribute('content')).toBe('yes'))
    expect(document.getElementById('client-child')).not.toBeNull()
  })

  it('an unmount before load removes the server tags of that component', async () => {
    serverRender('Parent')
    expect(document.querySelector('meta[name="child"]')).not.toBeNull()
    const { head, setShowChild } = hydrateApp('Parent')
    head.finishHydration()
    setShowChild(false)
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  it('keeps the server head until the app loads after navigation', async () => {
    serverRender('Navigation')
    const { head, setPage } = hydrateApp('Navigation')
    head.finishHydration()

    const load = vi.spyOn(head, 'load')
    setPage('next')
    await settle()
    expect(document.getElementById('next')).not.toBeNull()
    expect(load).not.toHaveBeenCalled()
    expect(document.title).toBe('First page')

    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="next-mounted"]')).not.toBeNull())
    expect(document.title).toBe('Next page')
  })

  it('resolves function values on activation', async () => {
    serverRender('Getter')
    const { head, setTitle } = hydrateApp('Getter')
    head.finishHydration()
    setTitle('Two')
    expect(document.title).toBe('One')
    await head.load()
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })
})
