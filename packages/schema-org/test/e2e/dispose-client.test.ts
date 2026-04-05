import { defineWebPage, defineWebSite, UnheadSchemaOrg, useSchemaOrg } from '@unhead/schema-org'
import { createHead as createClientHead } from 'unhead/client'
import { createHead as createServerHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { useDom } from '../../../unhead/test/fixtures'

describe('schema.org client dispose (#577)', () => {
  it('clears schema-org from DOM when entry is disposed (manual render)', async () => {
    const dom = useDom()
    const csrHead = createClientHead({
      plugins: [UnheadSchemaOrg({ host: 'https://example.com' })],
      document: dom.window.document,
    })

    // Persistent layout entry
    useSchemaOrg(csrHead, [
      defineWebSite({ name: 'My Site' }),
    ])

    // Component entry that will be unmounted
    const comp2Entry = useSchemaOrg(csrHead, [
      defineWebPage({ name: 'Comp2 Page' }),
    ])

    // Initial render already happened via entries:updated hook
    expect(dom.serialize()).toContain('My Site')
    expect(dom.serialize()).toContain('Comp2 Page')

    // Dispose triggers invalidate() -> entries:updated -> auto re-render
    comp2Entry.dispose()

    // Should be cleared automatically without manual renderDOMHead call
    const html = dom.serialize()
    expect(html).toContain('My Site')
    expect(html).not.toContain('Comp2 Page')
  })

  it('fully clears schema-org from DOM when all entries disposed (auto render)', async () => {
    const dom = useDom()
    const csrHead = createClientHead({
      plugins: [UnheadSchemaOrg({ host: 'https://example.com' })],
      document: dom.window.document,
    })

    const entry = useSchemaOrg(csrHead, [
      defineWebPage({ name: 'Dynamic Page' }),
    ])

    expect(dom.serialize()).toContain('Dynamic Page')
    expect(dom.serialize()).toContain('application/ld+json')

    // Dispose should auto-trigger re-render and remove the script tag
    entry.dispose()

    const html = dom.serialize()
    expect(html).not.toContain('Dynamic Page')
    expect(html).not.toContain('@graph')
  })

  it('re-mount after dispose shows new schema data', async () => {
    const dom = useDom()
    const csrHead = createClientHead({
      plugins: [UnheadSchemaOrg({ host: 'https://example.com' })],
      document: dom.window.document,
    })

    // Mount
    const entry1 = useSchemaOrg(csrHead, [
      defineWebPage({ name: 'First Mount' }),
    ])

    expect(dom.serialize()).toContain('First Mount')

    // Unmount
    entry1.dispose()
    expect(dom.serialize()).not.toContain('First Mount')

    // Re-mount with different data
    useSchemaOrg(csrHead, [
      defineWebPage({ name: 'Second Mount' }),
    ])

    const html = dom.serialize()
    expect(html).not.toContain('First Mount')
    expect(html).toContain('Second Mount')
  })

  it('hydrated SSR schema clears on component unmount', async () => {
    // SSR render
    const ssrHead = createServerHead({
      disableDefaults: true,
      plugins: [UnheadSchemaOrg({ host: 'https://example.com' })],
    })

    useSchemaOrg(ssrHead, [
      defineWebSite({ name: 'My Site' }),
    ])
    useSchemaOrg(ssrHead, [
      defineWebPage({ name: 'Comp2 Page' }),
    ])

    const data = renderSSRHead(ssrHead)
    expect(data.bodyTags).toContain('Comp2 Page')

    // Hydrate on client
    const dom = useDom(data)
    const csrHead = createClientHead({
      plugins: [UnheadSchemaOrg({ host: 'https://example.com' })],
      document: dom.window.document,
    })

    // Re-register entries on client (as Vue components would)
    useSchemaOrg(csrHead, [
      defineWebSite({ name: 'My Site' }),
    ])
    const comp2Entry = useSchemaOrg(csrHead, [
      defineWebPage({ name: 'Comp2 Page' }),
    ])

    expect(dom.serialize()).toContain('Comp2 Page')

    // Unmount Comp2
    comp2Entry.dispose()

    const html = dom.serialize()
    expect(html).toContain('My Site')
    expect(html).not.toContain('Comp2 Page')
  })
})
