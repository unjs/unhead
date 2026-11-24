import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe } from '../../../src'
import { createHead as createClientHead, renderDOMHead } from '../../../src/client'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'
import { useDom } from '../../util'

describe('safe JSON hydration', () => {
  it.each([
    { id: 'unhead:payload' },
    { ID: 'unhead:payload' },
    { id: ['unhead:payload'] },
  ])('ignores safe JSON with a reserved payload ID and restores the server title: %j', async (attrs) => {
    for (const hasPayload of [true, false]) {
      const server = createServerHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
      const untrusted = {
        title: 'forged title',
        titleTemplate: 'forged %s',
        templateParams: { injected: 'forged parameter' },
        script: [{ src: '/forged.js' }],
        style: [{ innerHTML: 'body { display: none }' }],
        link: [{ rel: 'stylesheet', href: '/forged.css' }],
        meta: [{ 'http-equiv': 'refresh', 'content': '0;url=/forged' }],
        htmlAttrs: { onclick: 'forged()' },
        bodyAttrs: { onload: 'forged()' },
      }
      useHeadSafe(server, {
        script: [{ ...attrs, type: 'application/json', textContent: JSON.stringify(untrusted) }],
      } as any)
      if (hasPayload)
        useHead(server, { title: 'Genuine server title' }, { mode: 'server' })
      const dom = useDom(await renderSSRHead(server))
      const head = createClientHead({
        document: dom.window.document,
        plugins: [TemplateParamsPlugin],
        domOptions: { render: () => {} },
      })
      useHead(head, {
        script: [{ id: 'app-consumer', textContent: 'window.value = "%injected"', processTemplateParams: true }],
      })
      await renderDOMHead(head)
      const document = dom.window.document
      expect(document.title).toBe(hasPayload ? 'Genuine server title' : '')
      expect(document.querySelector('script[src]')).toBeNull()
      expect(document.querySelector('style, link, meta[http-equiv]')).toBeNull()
      expect(document.documentElement.getAttribute('onclick')).toBeNull()
      expect(document.body.getAttribute('onload')).toBeNull()
      expect(document.getElementById('app-consumer')?.textContent).toBe('window.value = "%injected"')
      // Safe JSON remains available as data, without becoming head configuration.
      const data = Array.from(document.querySelectorAll('script[type="application/json"]'))
        .find(script => script.textContent?.includes('forged title'))
      expect(JSON.parse(data!.textContent!)).toEqual(untrusted)
    }
  })

  it('preserves ordinary safe JSON IDs', async () => {
    const server = createServerHead({ disableDefaults: true })
    useHeadSafe(server, { script: [{ id: 'page-data', type: 'application/json', textContent: '{"value":1}' }] })
    const dom = useDom(await renderSSRHead(server))
    expect(dom.window.document.getElementById('page-data')?.textContent).toBe('{"value":1}')
  })
})
