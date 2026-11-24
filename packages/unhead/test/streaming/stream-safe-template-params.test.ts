import { runInNewContext } from 'node:vm'
import { JSDOM } from 'jsdom'
import { useHeadSafe } from 'unhead'
import { createHead } from 'unhead/client'
import { createHead as createLazyHead } from 'unhead/lazy'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { attachStreamHead, createStreamableHead as createClientStreamableHead } from 'unhead/stream/client'
import { createStreamableHead, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { init as initIife } from '../../src/stream/iife'
import { buildStreamingPluginOptions, VIRTUAL_CLIENT_ID } from '../../src/stream/unplugin'

const TITLE = 'x";alert(1);//'

let originalWindow: any
let originalDocument: any

beforeEach(() => {
  originalWindow = globalThis.window
  originalDocument = globalThis.document
})

afterEach(() => {
  globalThis.window = originalWindow
  globalThis.document = originalDocument
})

describe('streamed useHeadSafe titles', () => {
  it.each(['inline', 'module', 'lazy'] as const)('stay out of app scripts when replaying %s entries', async (mode) => {
    const { head } = createStreamableHead()
    useHeadSafe(head, { title: TITLE })
    const chunk = renderSSRHeadSuspenseChunk(head)
    const updates: unknown[] = JSON.parse(chunk.slice(chunk.indexOf('(') + 1, chunk.lastIndexOf(')')))
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    const window = dom.window as any
    const { document } = window
    globalThis.window = window
    globalThis.document = document
    window.__unhead__ = { _q: [updates], push: (batch: unknown[]) => window.__unhead__._q.push(batch) }

    let client
    if (mode === 'lazy') {
      const lazy = createLazyHead({ document, streamKey: '__unhead__', plugins: [TemplateParamsPlugin] })
      lazy.finishHydration()
      client = await lazy.load()
    }
    else {
      if (mode === 'inline') {
        initIife()
      }
      else {
        const plugin = buildStreamingPluginOptions({ framework: 'unhead', mode: 'module' })
        const { code } = (plugin.load as any).handler.call({}, `\0${VIRTUAL_CLIENT_ID}`)
        const body = code.split('\n').filter((line: string) => !line.startsWith('import')).join('\n')
        runInNewContext(body, { attachStreamHead, createHead, window, document })
      }
      client = createClientStreamableHead({ plugins: [TemplateParamsPlugin] })!
    }

    client.push({ script: [{ textContent: 'window.t = "%pageTitle"', processTemplateParams: true }] })
    client.render()

    await vi.waitFor(() => expect({
      title: document.title,
      script: document.querySelector('script')?.textContent,
    }).toEqual({ title: TITLE, script: 'window.t = ""' }))
  })
})
