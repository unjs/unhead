import type { ResolvableHead } from 'unhead/types'
import { runInNewContext } from 'node:vm'
import { createHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/unplugin/vite'
import { runTransform } from './utils'

async function render(source: string, transformJsonLd = true, globals = {}) {
  let code = source
  for (const plugin of Unhead({ transformJsonLd, transformInlineScripts: false, devtools: false })) {
    if (plugin.transform)
      code = (await runTransform(plugin, code, '/app/schema.ts'))?.code ?? code
  }
  const head = createHead({ disableDefaults: true })
  runInNewContext(code, { useHead: (input: ResolvableHead) => head.push(input), ...globals })
  return head.render().headTags
}

const schema = `useHead({
  title: '🍃',
  script: [{ type: 'application/ld+json', innerHTML: { name: 'Acme', details: { a: 1, b: 2 } } }],
})`

describe('static JSON-LD keys', () => {
  it('deduplicates reordered object keys while preserving the rendered order', async () => {
    const html = await render(`${schema}
      useHead({
        script: [{ type: 'application/ld+json', textContent: { details: { b: 2, a: 1 }, name: 'Acme' } }],
      })
    `)

    expect(html.match(/<script\b/g)).toHaveLength(1)
    expect(html).toContain('>{"details":{"b":2,"a":1},"name":"Acme"}</script>')
  })

  it('uses the same key for equivalent client and server branches', async () => {
    const source = `useHead({
      script: [{
        type: 'application/ld+json',
        innerHTML: server ? { name: 'Acme', id: 1 } : { id: 1, name: 'Acme' },
      }],
    })`
    const server = await render(source, true, { server: true })
    const client = await render(source, true, { server: false })

    expect(server).toMatch(/data-hid="[^"]+"/)
    expect(client.match(/data-hid="[^"]+"/)?.[0]).toBe(server.match(/data-hid="[^"]+"/)?.[0])
  })

  it('preserves different array orders and explicit keys', async () => {
    const html = await render(`
      useHead({ script: [
        { type: 'application/ld+json', innerHTML: { list: [1, 2] } },
        { type: 'application/ld+json', innerHTML: { list: [2, 1] } },
        { type: 'application/ld+json', innerHTML: { list: [1, 2] }, key: 'custom' },
      ] })
    `)

    expect(html.match(/<script\b/g)).toHaveLength(3)
    expect(html).toContain('data-hid="custom"')
  })

  it('leaves dynamic, ambiguous, and unrelated scripts unkeyed', async () => {
    const html = await render(`
      useHead({ script: [
        { type: 'application/ld+json', innerHTML: payload },
        { type: 'application/ld+json', innerHTML: server ? { name: 'A' } : { name: 'B' } },
        { type: 'application/ld+json', innerHTML: { name: 'C' }, ...attrs },
        { type: 'application/json', innerHTML: { name: 'D' } },
      ] })
    `, true, { payload: { name: 'Dynamic' }, server: true, attrs: { id: 'manual-id' } })

    expect(html.match(/<script\b/g)).toHaveLength(4)
    expect(html).not.toContain('data-hid')
  })

  it('leaves static calls unkeyed when disabled', async () => {
    expect(await render(schema, false)).not.toContain('data-hid')
  })
})
