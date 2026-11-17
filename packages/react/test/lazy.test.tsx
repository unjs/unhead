// @vitest-environment jsdom
import type { ReactElement } from 'react'
import { act, StrictMode, useEffect, useState } from 'react'
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
  return head
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
    expect(head.entries.size).toBe(1)
    expect(document.title).toBe('Home')

    await head.load()
    await settle()
    expect([...document.head.children]).toEqual(nodes)
  })

  // StrictMode reruns each effect in development, so the dispose of the first run is a change
  it('in development, StrictMode loads the runtime after hydration and keeps the server head', async () => {
    function Home() {
      useHead({ title: 'Home', meta: [{ name: 'description', content: 'desc' }] })
      return <div id="home">home</div>
    }
    serverRender(<Home />)
    const head = createLazyHead()
    const load = vi.spyOn(head, 'load')
    // as the installation guide wraps the provider
    await hydrate(<Home />, head, root => <StrictMode>{root}</StrictMode>)
    expect(load).toHaveBeenCalled()
    await settle()
    expect(document.title).toBe('Home')
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
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

  it('a state change after hydration loads the runtime and reaches the document', async () => {
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
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.title).toBe('Two'))
  })

  it('a component mounted after hydration loads at once', async () => {
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
    await hydrate(<App />)
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
    const navigation = pausable(head)
    await hydrate(<Parent />, head)
    navigation.pause()
    await show.set(false)
    navigation.resume()
    await vi.waitFor(() => expect(document.querySelector('meta[name="child"]')).toBeNull())
    expect(document.title).toBe('Parent')
  })

  it('a new page during a navigation pause does not load until the pause lifts', async () => {
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
    const navigation = pausable(head)
    await hydrate(<App />, head)

    navigation.pause()
    const load = vi.spyOn(head, 'load')
    await page.set('next')
    await settle()
    expect(document.getElementById('next')).not.toBeNull()
    expect(load).not.toHaveBeenCalled()
    expect(document.title).toBe('First page')

    navigation.resume()
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.querySelector('meta[name="next"]')).not.toBeNull())
    expect(document.title).toBe('Next page')
  })
})
