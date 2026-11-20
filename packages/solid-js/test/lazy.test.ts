// @vitest-environment jsdom
import type { ViteDevServer } from 'vite'
import type { LazyAppName } from './fixtures/lazy-app'
import { resolve } from 'node:path'
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
  // jsdom does not run the inline hydration script, so run its code here
  // eslint-disable-next-line no-new-func
  new Function(hydrationScript.replace(/^<script>|<\/script>.*$/g, ''))()
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

// A navigation pause, as a router holds one while the next page loads
function pausable(head: ReturnType<typeof createLazyHead>) {
  let paused = false
  head.hooks.hook('dom:beforeRender', (ctx) => {
    ctx.shouldRender = !paused
  })
  return {
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
      head.render()
    },
  }
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
    head.render()
    await settle()
    expect(load).not.toHaveBeenCalled()
    expect(document.getElementById('home')).toBe(element)
    expect(head.entries.size).toBe(1)
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
    head.render()
    await settle()
    expect(load).not.toHaveBeenCalled()
  })

  it('a signal change after hydration loads the runtime and reaches the document', async () => {
    serverRender('Signal')
    const { head, setTitle } = hydrateApp('Signal')
    const load = vi.spyOn(head, 'load')
    head.render()
    await settle()
    expect(load).not.toHaveBeenCalled()

    setTitle('Two')
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  it('a push in onMount loads at once, before hydration ends', async () => {
    serverRender('MountPush')
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    hydrateApp('MountPush', head)
    expect(load).toHaveBeenCalled()
    head.render()
    await vi.waitFor(() => expect(document.querySelector('meta[name="mounted"]')?.getAttribute('content')).toBe('yes'))
  })

  it('a component shown after mount loads at once', async () => {
    serverRender('ShowAfterMount')
    expect(document.getElementById('client-child')).toBeNull()
    hydrateApp('ShowAfterMount')
    await vi.waitFor(() => expect(document.querySelector('meta[name="client-child"]')?.getAttribute('content')).toBe('yes'))
    expect(document.getElementById('client-child')).not.toBeNull()
  })

  it('an unmount before load removes the server tags of that component', async () => {
    serverRender('Parent')
    expect(document.querySelector('meta[name="child"]')).not.toBeNull()
    const { head, setShowChild } = hydrateApp('Parent')
    const navigation = pausable(head)
    head.render()
    navigation.pause()
    setShowChild(false)
    navigation.resume()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  it('a new page during a navigation pause does not load until the pause lifts', async () => {
    serverRender('Navigation')
    const { head, setPage } = hydrateApp('Navigation')
    const navigation = pausable(head)
    head.render()

    navigation.pause()
    const load = vi.spyOn(head, 'load')
    setPage('next')
    await settle()
    expect(document.getElementById('next')).not.toBeNull()
    expect(load).not.toHaveBeenCalled()
    expect(document.title).toBe('First page')

    navigation.resume()
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.querySelector('meta[name="next-mounted"]')).not.toBeNull())
    expect(document.title).toBe('Next page')
  })

  // The composable patches with the same input in its mount effect. The lazy head cannot
  // compare a function value, so that patch counts as a change.
  it('a function value loads the runtime once hydration ends', async () => {
    serverRender('Getter')
    expect(document.title).toBe('Getter')
    const { head } = hydrateApp('Getter')
    const load = vi.spyOn(head, 'load')
    head.render()
    await settle()
    expect(load).toHaveBeenCalledTimes(1)
  })
})
