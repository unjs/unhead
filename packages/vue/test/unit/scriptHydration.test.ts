// @vitest-environment jsdom
import { createHead } from '@unhead/vue/client'
import { createHead as createServerHead, renderSSRHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, Suspense } from 'vue'
import { injectHead } from '../../src'
import { useScript } from '../../src/scripts/useScript'

const src = 'https://cdn.example.com/hydration.js'
const nextTask = () => new Promise(resolve => setTimeout(resolve))

const Status = defineComponent({
  setup() {
    const { status } = useScript(src, { trigger: 'server' })
    return () => h('p', { id: 'status' }, status.value)
  },
})

// an async child resumes its setup, and calls useScript, while the app still hydrates
const AsyncStatus = defineComponent({
  async setup() {
    // the component instance is gone after the await, so inject the head first
    const head = injectHead()
    await new Promise(resolve => setTimeout(resolve, 10))
    const { status } = useScript(src, { trigger: 'server', head })
    return () => h('p', { id: 'status' }, status.value)
  },
})

const apps = [
  ['a component', () => h(Status)],
  ['an async component', () => h(Suspense, null, { default: () => h(AsyncStatus) })],
] as const

async function hydrate(render: () => ReturnType<typeof h>, serverLoaded: boolean) {
  const App = defineComponent({ setup: () => render })
  const serverHead = createServerHead({ disableDefaults: true })
  const html = await renderToString(createSSRApp(App).use(serverHead))
  document.head.innerHTML = renderSSRHead(serverHead).headTags
  document.body.innerHTML = `<div id="app">${html}</div>`
  const serverEl = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)!
  if (serverLoaded)
    serverEl.dataset.onloadfired = 'true'
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const app = createSSRApp(App).use(createHead({ document }))
  app.mount('#app')
  await new Promise(resolve => setTimeout(resolve, 30))
  const hydrationWarnings = [...warn.mock.calls, ...error.mock.calls]
    .map(call => String(call[0]))
    .filter(message => message.includes('ydration'))
  warn.mockRestore()
  error.mockRestore()
  return { app, html, hydrationWarnings, serverEl }
}

describe('vue useScript trigger: server hydration', () => {
  it.each(apps)('hydrates the server status in %s while the server script loads', async (_, render) => {
    const { app, html, hydrationWarnings, serverEl } = await hydrate(render, false)

    expect(html).toContain('>loading<')
    expect(hydrationWarnings).toEqual([])
    serverEl.dispatchEvent(new Event('load'))
    await nextTask()
    expect(document.querySelector('#status')?.textContent).toBe('loaded')
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1)
    app.unmount()
  })

  it.each(apps)('hydrates the server status in %s when the server script already loaded', async (_, render) => {
    const { app, hydrationWarnings } = await hydrate(render, true)

    expect(hydrationWarnings).toEqual([])
    expect(document.querySelector('#status')?.textContent).toBe('loaded')
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1)
    app.unmount()
  })
})
