import type { HeadTag } from '../../../src/types'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { createHead } from '../../../src/lazy'
import { ValidatePlugin } from '../../../src/plugins'

// A page with no server render, such as a Nuxt `ssr: false` route. The shell holds only the
// app head. The integration calls `head.load()` at once and holds renders with a
// `dom:beforeRender` pause until the app has mounted, as Nuxt does for its default client head.
// The page component pushes its entries after the runtime has loaded, because the page chunk
// loads after the runtime. A load that no change started before hydration ended adopts nothing.
function spaShell() {
  return new JSDOM('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
}

const appHead = { meta: [{ charset: 'utf-8' }] }
const pageHead = { title: 'SPA page', meta: [{ name: 'description', content: 'SPA description' }] }

function mountPause() {
  const state = { paused: true }
  const hook = (ctx: { shouldRender: boolean }) => {
    if (state.paused)
      ctx.shouldRender = false
  }
  return { state, hook }
}

function titleWarnings(warn: { mock: { calls: unknown[][] } }) {
  return warn.mock.calls.map(args => String(args[0])).filter(m => m.includes('missing a <title>'))
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('lazy head with no server head', () => {
  it('resolves tags only for the current entries once the app has mounted', async () => {
    const dom = spaShell()
    const doc = dom.window.document
    const pause = mountPause()
    const resolved: string[][] = []
    const head = createHead({
      document: doc,
      hooks: {
        'dom:beforeRender': pause.hook,
        'tags:afterResolve': ({ tags }: { tags: HeadTag[] }) => {
          resolved.push(tags.map(t => t.tag))
        },
      },
    })
    head.push(appHead)
    expect(await head.load()).toBe(true)
    head.push(pageHead)
    // the app has mounted
    pause.state.paused = false
    head.render()
    await vi.waitFor(() => expect(doc.title).toBe('SPA page'))
    // no server head applies, so no render resolves the app head alone
    expect(resolved.filter(tags => !tags.includes('title'))).toEqual([])
  })

  it('does not warn that a page with a title is missing one', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dom = spaShell()
    const doc = dom.window.document
    const pause = mountPause()
    const head = createHead({ document: doc, plugins: [ValidatePlugin()], hooks: { 'dom:beforeRender': pause.hook } })
    head.push(appHead)
    expect(await head.load()).toBe(true)
    head.push(pageHead)
    pause.state.paused = false
    head.render()
    await vi.waitFor(() => expect(doc.title).toBe('SPA page'))
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(titleWarnings(warn)).toEqual([])
  })

  // Control: the default client head, with the same pause and pushes, does not warn.
  it('matches the default client head, which does not warn', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dom = spaShell()
    const doc = dom.window.document
    const pause = mountPause()
    const head = createClientHead({ document: doc, plugins: [ValidatePlugin()], hooks: { 'dom:beforeRender': pause.hook } })
    head.push(appHead)
    head.push(pageHead)
    pause.state.paused = false
    head.render()
    await vi.waitFor(() => expect(doc.title).toBe('SPA page'))
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(titleWarnings(warn)).toEqual([])
  })
})
