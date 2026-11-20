// @vitest-environment jsdom
import type { ViteDevServer } from 'vite'
import type { LazyAppName } from './fixtures/lazy/apps'
import { resolve } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { flushSync, hydrate, unmount } from 'svelte'
import { createServer } from 'vite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead as createLazyHead, UnheadContextKey } from '../src/lazy'
import config from '../vitest.config'
import { apps } from './fixtures/lazy/apps'

let server: ViteDevServer
let renderApp: typeof import('./fixtures/lazy/ssr').renderApp

// The server half runs through a Vite SSR server, so Svelte compiles the components for
// the server there, as in a real app. The test file itself runs the client build.
beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: resolve(__dirname, '..'),
    logLevel: 'silent',
    appType: 'custom',
    plugins: [svelte()],
    resolve: { alias: config.resolve!.alias },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  })
  ;({ renderApp } = await server.ssrLoadModule(resolve(__dirname, 'fixtures/lazy/ssr.ts')))
})
afterAll(() => server?.close())

let mounted: Record<string, any>[] = []

function serverRender(name: LazyAppName) {
  // jsdom defines `window`, which tells the composables they run in a browser
  vi.stubGlobal('window', undefined)
  try {
    const { html, headTags } = renderApp(name)
    document.head.innerHTML = headTags
    document.body.innerHTML = `<div id="app">${html}</div>`
  }
  finally {
    vi.unstubAllGlobals()
  }
}

function hydrateApp(name: LazyAppName, head = createLazyHead()) {
  const app = hydrate(apps[name], {
    target: document.getElementById('app')!,
    context: new Map([[UnheadContextKey, head]]),
  }) as Record<string, any>
  mounted.push(app)
  return { head, app }
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
  mounted.forEach(app => unmount(app))
  mounted = []
  // a loaded head renders the unmount on a timer, so let it finish before the next test
  await settle()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('svelte lazy head', () => {
  it('hydrates the server element and leaves the server head alone', async () => {
    serverRender('Home')
    const element = document.getElementById('home')
    expect(document.body.innerHTML).toContain('<!--[-->')
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

  it('a state change after hydration loads the runtime and reaches the document', async () => {
    serverRender('Title')
    const { head, app } = hydrateApp('Title')
    const load = vi.spyOn(head, 'load')
    head.render()
    // the effect patches with an equal input after hydration, which loads nothing
    await settle()
    expect(load).not.toHaveBeenCalled()

    app.setTitle('Two')
    flushSync()
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  // Svelte runs onMount after hydrate() returns, so a call to render() right after it
  // ends hydration first
  it('a push in onMount loads the runtime', async () => {
    serverRender('MountPush')
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    hydrateApp('MountPush', head)
    expect(load).not.toHaveBeenCalled()
    head.render()
    await vi.waitFor(() => expect(document.querySelector('meta[name="mounted"]')?.getAttribute('content')).toBe('yes'))
    expect(load).toHaveBeenCalled()
  })

  it('a component shown after mount loads the runtime', async () => {
    serverRender('ShowAfterMount')
    expect(document.getElementById('client-child')).toBeNull()
    const { head } = hydrateApp('ShowAfterMount')
    head.render()
    await vi.waitFor(() => expect(document.querySelector('meta[name="client-child"]')?.getAttribute('content')).toBe('yes'))
    expect(document.getElementById('client-child')).not.toBeNull()
  })

  it('an unmount before load removes the server tags of that component', async () => {
    serverRender('Parent')
    expect(document.querySelector('meta[name="child"]')).not.toBeNull()
    const { head, app } = hydrateApp('Parent')
    const navigation = pausable(head)
    head.render()
    // Svelte disposes an entry from onDestroy, which waits for the mount effects
    await settle()
    navigation.pause()
    app.hideChild()
    flushSync()
    navigation.resume()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  it('a new page during a navigation pause does not load until the pause lifts', async () => {
    serverRender('Navigation')
    const { head, app } = hydrateApp('Navigation')
    const navigation = pausable(head)
    head.render()
    await settle()

    navigation.pause()
    const load = vi.spyOn(head, 'load')
    app.navigate()
    flushSync()
    await settle()
    expect(document.getElementById('next')).not.toBeNull()
    expect(load).not.toHaveBeenCalled()
    expect(document.title).toBe('First page')

    navigation.resume()
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.querySelector('meta[name="next-mounted"]')).not.toBeNull())
    expect(document.title).toBe('Next page')
  })
})
