import * as unheadServer from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { createHead, prepareTemplate, renderSSRHead, transformHtmlTemplate } from '../src/server'

// Guards src/server.ts: the entry must re-export the unhead/server helpers
// unmodified and they must round-trip non-streaming SSR rendering end to end.
describe('solid-js server entry', () => {
  it('re-exports the unhead/server helpers as the same references', () => {
    expect(createHead).toBe(unheadServer.createHead)
    expect(renderSSRHead).toBe(unheadServer.renderSSRHead)
    expect(prepareTemplate).toBe(unheadServer.prepareTemplate)
    expect(transformHtmlTemplate).toBe(unheadServer.transformHtmlTemplate)
  })

  it('renders pushed entries into an SSR payload', () => {
    const head = createHead({ disableDefaults: true })
    head.push({
      title: 'Solid SSR',
      meta: [{ name: 'description', content: 'solid server entry' }],
    })
    const payload = renderSSRHead(head)
    expect(payload.headTags).toContain('<title>Solid SSR</title>')
    expect(payload.headTags).toContain('name="description"')
    expect(payload.headTags).toContain('content="solid server entry"')
  })

  it('renders html and body attributes alongside the head tags', () => {
    const head = createHead({ disableDefaults: true })
    head.push({
      htmlAttrs: { lang: 'de' },
      bodyAttrs: { class: 'dark' },
      meta: [{ name: 'theme-color', content: '#000000' }],
    })
    const payload = renderSSRHead(head)
    expect(payload.htmlAttrs).toContain('lang="de"')
    expect(payload.bodyAttrs).toContain('class="dark"')
    expect(payload.headTags).toContain('name="theme-color"')
  })

  it('injects rendered tags into the head of an HTML template', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'Template' })
    const html = transformHtmlTemplate(head, '<html><head></head><body><div>app</div></body></html>')
    expect(html).toContain('<title>Template</title>')
    expect(html).toContain('<div>app</div>')
    // rendered tags belong to the head, never after the body content
    expect(html.indexOf('<title>Template</title>')).toBeLessThan(html.indexOf('<body>'))
  })

  it('accepts a prepareTemplate result as a frozen reusable template', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'Prepared' })
    const template = prepareTemplate('<html><head></head><body></body></html>')
    expect(Object.isFrozen(template)).toBe(true)
    const html = transformHtmlTemplate(head, template)
    expect(html).toContain('<title>Prepared</title>')
  })
})
