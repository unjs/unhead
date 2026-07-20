// @vitest-environment jsdom

import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { createHead as createCsrHead, useHead as useCsrHead } from '../../src/precompiled/client-csr'
import { createHead as createDeferredHead, useHead as useDeferredHead } from '../../src/precompiled/client-deferred'

function compiled(input: PrecompiledClientInput): never {
  return input as never
}

function mountHead(head: ReturnType<typeof createCsrHead> | ReturnType<typeof createDeferredHead>, useHead: typeof useCsrHead | typeof useDeferredHead, plan: PrecompiledClientInput) {
  const app = createApp(defineComponent({
    setup() {
      useHead(compiled(plan))
      return () => h('div')
    },
  }))
  const root = document.createElement('div')
  document.body.appendChild(root)
  app.use(head)
  app.mount(root)
  return app
}

beforeEach(() => {
  document.title = ''
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('precompiled Vue client profiles', () => {
  it('keeps the CSR runtime isolated from server-rendered nodes', () => {
    document.head.innerHTML = '<meta name="description" content="server">'
    const head = createCsrHead()
    const app = mountHead(head, useCsrHead, [[100, 'meta:description', 'meta', { name: 'description', content: 'client' }]])

    expect(document.head.querySelectorAll('meta')).toHaveLength(2)
    expect(document.head.querySelectorAll('meta')[1].getAttribute('content')).toBe('client')

    app.unmount()
    expect(document.head.querySelectorAll('meta')).toHaveLength(1)
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('server')
  })

  it('queues deferred plans until the DOM runtime loads', async () => {
    document.title = 'Server'
    const head = createDeferredHead()
    const app = mountHead(head, useDeferredHead, [[100, 'title', 'title', {}, 'Client']])

    expect(document.title).toBe('Server')
    await head.ready
    expect(document.title).toBe('Client')

    app.unmount()
    expect(document.title).toBe('Server')
  })

  it('does not replay a deferred plan disposed before loading', async () => {
    document.title = 'Server'
    const head = createDeferredHead()
    const app = mountHead(head, useDeferredHead, [[100, 'title', 'title', {}, 'Client']])
    app.unmount()

    await head.ready
    expect(document.title).toBe('Server')
  })

  it('deactivates and restores deferred plans through KeepAlive', async () => {
    const Home = defineComponent({
      setup() {
        useDeferredHead(compiled([[100, 'title', 'title', {}, 'Home']]))
        return () => h('div', 'home')
      },
    })
    const About = defineComponent({
      setup() {
        useDeferredHead(compiled([[100, 'title', 'title', {}, 'About']]))
        return () => h('div', 'about')
      },
    })
    const page = ref<'home' | 'about'>('home')
    const Root = defineComponent({
      setup() {
        return () => h(KeepAlive, [h(page.value === 'home' ? Home : About, { key: page.value })])
      },
    })
    const head = createDeferredHead()
    const app = createApp(Root)
    const root = document.createElement('div')
    document.body.appendChild(root)
    app.use(head)
    app.mount(root)
    await head.ready
    expect(document.title).toBe('Home')

    page.value = 'about'
    await nextTick()
    expect(document.title).toBe('About')

    page.value = 'home'
    await nextTick()
    expect(document.title).toBe('Home')

    app.unmount()
    expect(document.title).toBe('')
  })
})
