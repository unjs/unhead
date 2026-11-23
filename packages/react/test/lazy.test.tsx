// @vitest-environment jsdom
import type { ReactElement } from 'react'
import { act, StrictMode, Suspense, useEffect, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHead } from '../src'
import { createHead as createLazyHead, UnheadProvider } from '../src/lazy'
import { createHead as createServerHead, renderSSRHead, UnheadProvider as ServerProvider } from '../src/server'

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const settle = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

function serverRender(app: ReactElement) {
  const head = createServerHead({ disableDefaults: true })
  const html = renderToString(<ServerProvider value={head}>{app}</ServerProvider>)
  document.head.innerHTML = renderSSRHead(head).headTags
  document.body.innerHTML = `<div id="app">${html}</div>`
}

let roots: { unmount: () => void }[] = []

async function hydrate(app: ReactElement, head = createLazyHead(), wrap = (root: ReactElement) => root) {
  await act(async () => {
    roots.push(hydrateRoot(document.getElementById('app')!, wrap(<UnheadProvider value={head}>{app}</UnheadProvider>)))
  })
  head.finishHydration()
  return head
}

// Lets a test change component state from outside React
function controls<T>() {
  let set!: (value: T) => void
  return {
    bind: (setter: (value: T) => void) => {
      set = setter
    },
    set: (value: T) => act(() => set(value)),
  }
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
})
afterEach(async () => {
  act(() => roots.forEach(root => root.unmount()))
  roots = []
  // a loaded head renders the unmount on a timer, so let it finish before the next test
  await settle()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('react lazy head', () => {
  it('hydrates the server element and leaves the server head alone', async () => {
    function Home() {
      useHead({ title: 'Home', meta: [{ name: 'description', content: 'desc' }] })
      return <div id="home">home</div>
    }
    serverRender(<Home />)
    const element = document.getElementById('home')
    const nodes = [...document.head.children]
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    await hydrate(<Home />, head)
    await settle()
    expect(load).not.toHaveBeenCalled()
    expect(document.getElementById('home')).toBe(element)
    expect(document.title).toBe('Home')

    await head.load()
    await settle()
    expect([...document.head.children]).toEqual(nodes)
  })

  it('keeps server tags through StrictMode and activation', async () => {
    function Home() {
      useHead({ title: 'Home', meta: [{ name: 'description', content: 'desc' }] })
      return <div id="home">home</div>
    }
    serverRender(<Home />)
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    // as the installation guide wraps the provider
    await hydrate(<Home />, head, root => <StrictMode>{root}</StrictMode>)
    expect(load).not.toHaveBeenCalled()
    await head.load()
    await settle()
    expect(document.title).toBe('Home')
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  })

  it('useHead() inside <Suspense> waits for activation and keeps one copy of each tag', async () => {
    function Page() {
      useHead({ title: 'Page', meta: [{ name: 'description', content: 'desc' }] })
      return <div id="page">page</div>
    }
    function Shell() {
      useHead({ meta: [{ name: 'shell', content: 'yes' }] })
      return <Suspense fallback={null}><Page /></Suspense>
    }
    serverRender(<Shell />)
    const element = document.getElementById('page')
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    await hydrate(<Shell />, head)
    expect(load).not.toHaveBeenCalled()
    await head.load()
    await settle()
    expect(document.getElementById('page')).toBe(element)
    expect(document.title).toBe('Page')
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="shell"]')).toHaveLength(1)
  })

  it('a re-render with an equal input loads nothing', async () => {
    const count = controls<number>()
    function Counter() {
      const [n, setN] = useState(0)
      count.bind(setN)
      useHead({ title: 'Counter' })
      return <button>{n}</button>
    }
    serverRender(<Counter />)
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    await hydrate(<Counter />, head)
    await count.set(1)
    await settle()
    expect(document.querySelector('button')?.textContent).toBe('1')
    expect(load).not.toHaveBeenCalled()
  })

  it('queues a state change until activation', async () => {
    const title = controls<string>()
    function Page() {
      const [value, setValue] = useState('One')
      title.bind(setValue)
      useHead({ title: value })
      return <div>{value}</div>
    }
    serverRender(<Page />)
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    await hydrate(<Page />, head)
    await settle()
    expect(load).not.toHaveBeenCalled()

    await title.set('Two')
    expect(document.title).toBe('One')
    await head.load()
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  it('a component mounted after hydration waits for activation', async () => {
    function ClientChild() {
      useHead({ meta: [{ name: 'client-child', content: 'yes' }] })
      return <span id="client-child">client child</span>
    }
    function App() {
      const [mounted, setMounted] = useState(false)
      useEffect(() => setMounted(true), [])
      return <div>{mounted ? <ClientChild /> : 'waiting'}</div>
    }
    serverRender(<App />)
    expect(document.getElementById('client-child')).toBeNull()
    const head = await hydrate(<App />)
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="client-child"]')?.getAttribute('content')).toBe('yes'))
    expect(document.getElementById('client-child')).not.toBeNull()
  })

  it('an unmount before load removes the server tags of that component', async () => {
    const show = controls<boolean>()
    function Child() {
      useHead({ meta: [{ name: 'child', content: 'yes' }] })
      return <span>child</span>
    }
    function Parent() {
      const [value, setValue] = useState(true)
      show.bind(setValue)
      useHead({ title: 'Parent' })
      return <div>{value ? <Child /> : 'gone'}</div>
    }
    serverRender(<Parent />)
    expect(document.querySelector('meta[name="child"]')).not.toBeNull()
    const head = createLazyHead()
    await hydrate(<Parent />, head)
    await show.set(false)
    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  it('keeps the server head until the app loads after navigation', async () => {
    const page = controls<'first' | 'next'>()
    function NextPage() {
      useHead({ title: 'Next page', meta: [{ name: 'next', content: 'yes' }] })
      return <span id="next">next</span>
    }
    function App() {
      const [value, setValue] = useState<'first' | 'next'>('first')
      page.bind(setValue)
      useHead({ title: 'First page' })
      return <div>{value === 'next' ? <NextPage /> : 'first'}</div>
    }
    serverRender(<App />)
    const head = createLazyHead()
    await hydrate(<App />, head)

    const load = vi.spyOn(head, 'load')
    await page.set('next')
    await settle()
    expect(document.getElementById('next')).not.toBeNull()
    expect(load).not.toHaveBeenCalled()
    expect(document.title).toBe('First page')

    await head.load()
    await vi.waitFor(() => expect(document.querySelector('meta[name="next"]')).not.toBeNull())
    expect(document.title).toBe('Next page')
  })
})
