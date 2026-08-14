// @vitest-environment jsdom

import type { PrecompiledClientInput } from 'unhead/precompiled/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { createHead, useHead } from '../../src/precompiled/client'

function compiled(input: PrecompiledClientInput): never {
  return input as never
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

describe('precompiled Vue client adapter', () => {
  it('installs, injects, and batches compiled plans and disposal', async () => {
    const head = createHead()
    const renderHead = vi.spyOn(head, 'render')
    const app = createApp(defineComponent({
      setup() {
        useHead(compiled([[100, 'meta:description', 'meta', { name: 'description', content: 'client' }]]))
        useHead(compiled([[100, 'meta:robots', 'meta', { name: 'robots', content: 'index' }]]))
        return () => h('div')
      },
    }))
    const root = document.createElement('div')
    document.body.appendChild(root)
    app.use(head)
    app.mount(root)

    expect(document.head.querySelector('meta')).toBeNull()
    await Promise.resolve()
    expect(renderHead).toHaveBeenCalledTimes(1)
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('client')
    app.unmount()
    expect(document.head.querySelector('meta')).not.toBeNull()
    await Promise.resolve()
    expect(renderHead).toHaveBeenCalledTimes(2)
    expect(document.head.querySelector('meta')).toBeNull()
  })

  it('routes an explicit { head } without injection', async () => {
    const head = createHead()
    const app = createApp(defineComponent({
      setup() {
        useHead(compiled([[100, 'title', 'title', {}, 'Explicit']]), { head })
        return () => h('div')
      },
    }))
    const root = document.createElement('div')
    document.body.appendChild(root)
    app.mount(root)

    await Promise.resolve()
    expect(document.title).toBe('Explicit')
    app.unmount()
    await Promise.resolve()
    expect(document.title).toBe('')
  })

  it('deactivates and restores compiled plans through KeepAlive', async () => {
    const Home = defineComponent({
      setup() {
        useHead(compiled([[100, 'title', 'title', {}, 'Home']]))
        return () => h('div', 'home')
      },
    })
    const About = defineComponent({
      setup() {
        useHead(compiled([[100, 'title', 'title', {}, 'About']]))
        return () => h('div', 'about')
      },
    })
    const page = ref<'home' | 'about'>('home')
    const Root = defineComponent({
      setup() {
        return () => h('div', [
          h(KeepAlive, [h(page.value === 'home' ? Home : About, { key: page.value })]),
        ])
      },
    })
    const head = createHead()
    const app = createApp(Root)
    const root = document.createElement('div')
    document.body.appendChild(root)
    app.use(head)
    app.mount(root)
    await Promise.resolve()
    expect(document.title).toBe('Home')

    page.value = 'about'
    await nextTick()
    await Promise.resolve()
    expect(document.title).toBe('About')

    page.value = 'home'
    await nextTick()
    await Promise.resolve()
    expect(document.title).toBe('Home')

    app.unmount()
    await Promise.resolve()
    expect(document.title).toBe('')
  })
})
