import type { ResolvableHead } from 'unhead/types'
import { JSDOM } from 'jsdom'
import { createHead as createClientHead, renderDOMHead } from 'unhead/client'
import { createHead as createServerHead, renderSSRHead } from 'unhead/server'
import { htmlTagsToHead } from 'unhead/vite'
import { describe, expect, it } from 'vitest'

const renderModes = ['SSR', 'client', 'hydration'] as const

function renderInputs(mode: typeof renderModes[number], inputs: ResolvableHead[]) {
  const server = createServerHead({ disableDefaults: true })
  for (const input of inputs)
    server.push(input, { tagDuplicateStrategy: 'merge' })
  const markup = mode === 'client' ? '' : renderSSRHead(server).headTags
  const document = new JSDOM(`<html><head>${markup}</head><body></body></html>`).window.document
  const original = document.querySelector('script')
  if (mode !== 'SSR') {
    const client = createClientHead({ document })
    for (const input of inputs)
      client.push(input, { tagDuplicateStrategy: 'merge' })
    renderDOMHead(client)
  }
  const script = document.querySelector('script')!
  expect(document.querySelectorAll('script')).toHaveLength(1)
  if (mode === 'hydration')
    expect(script).toBe(original)
  return script
}

describe.each(renderModes)('vite attributes during %s', (mode) => {
  it.each([
    ['class', ''],
    ['class', true],
    ['style', ''],
    ['style', true],
  ] as const)('preserves an empty %s attribute from %j', (attribute, value) => {
    const input = htmlTagsToHead([{ tag: 'script', attrs: { src: '/entry.js', [attribute]: value } }])
    const script = renderInputs(mode, [input])
    expect(script.getAttribute(attribute)).toBe('')
  })

  it.each(['raw-first', 'structured-first'])('merges class tokens in %s order', (order) => {
    const raw = htmlTagsToHead([{ tag: 'script', attrs: { id: 'same', class: 'plugin shared' }, injectTo: 'head' }])
    const structured = { script: [{ id: 'same', class: { app: true, shared: true } }] } as unknown as ResolvableHead
    const script = renderInputs(mode, order === 'raw-first' ? [raw, structured] : [structured, raw])
    expect([...script.classList]).toEqual(order === 'raw-first' ? ['plugin', 'shared', 'app'] : ['app', 'shared', 'plugin'])
  })

  it.each(['raw-first', 'structured-first'])('merges CSS declarations in %s order', (order) => {
    const raw = htmlTagsToHead([{
      tag: 'script',
      attrs: {
        id: 'same',
        style: '/*vite;comment*/color:red;--quoted:"a;b";background-image:url("data:image/svg+xml;utf8,<svg></svg>")',
      },
      injectTo: 'head',
    }])
    const structured = { script: [{ id: 'same', style: { color: 'blue', display: 'block' } }] } as unknown as ResolvableHead
    const script = renderInputs(mode, order === 'raw-first' ? [raw, structured] : [structured, raw])
    expect(script.style.color).toBe(order === 'raw-first' ? 'blue' : 'red')
    expect(script.style.display).toBe('block')
    expect(script.style.getPropertyValue('--quoted')).toBe('"a;b"')
    expect(script.style.backgroundImage).toContain('data:image/svg+xml;utf8,<svg></svg>')
  })
})

it.each([
  'key',
  'tagPosition',
  'tagPriority',
  'tagDuplicateStrategy',
  'innerHTML',
  'textContent',
  'processTemplateParams',
  '_vite',
])('adopts Vite scripts with an inert %s attribute', (attribute) => {
  const input = htmlTagsToHead([{ tag: 'script', attrs: { src: '/entry.js', [attribute]: 'plugin-value' } }])
  const script = renderInputs('hydration', [input])
  expect(script.getAttribute(attribute)).toBe('plugin-value')
})

it('adopts a structured script using its serialized Unhead key', () => {
  const script = renderInputs('hydration', [{ script: [{ key: 'entry', src: '/entry.js' }] }])
  expect(script.getAttribute('data-hid')).toBe('entry')
})

it('keeps comment-like URL content when merging Vite CSS', () => {
  const raw = htmlTagsToHead([{ tag: 'script', attrs: { id: 'same', style: 'background-image:url(https://example.com/*asset*/image.svg)' }, injectTo: 'head' }])
  const structured = { script: [{ id: 'same', style: { display: 'block' } }] } as unknown as ResolvableHead
  const script = renderInputs('SSR', [raw, structured])
  expect(script.style.backgroundImage).toContain('https://example.com/*asset*/image.svg')
})
