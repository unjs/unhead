import { JSDOM } from 'jsdom'
import { createHead as createClientHead } from 'unhead/client'
import { createHead as createServerHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

const disabledAttributes = [false, null, undefined] as const

function inputFor(name: 'class' | 'style', value: string | false | null | undefined) {
  return {
    script: [{ attrs: { id: 'asset', [name]: value } }],
    htmlAttrs: { attrs: { [name]: value } },
    bodyAttrs: { attrs: { [name]: value } },
  }
}

describe.each(['class', 'style'] as const)('literal %s attributes in the DOM', (name) => {
  it('preserves external edits when disposed', () => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = createClientHead({ document })
    const entry = head.push(inputFor(name, name === 'class' ? 'first old' : 'margin: 1px'))
    head.render()

    const external = name === 'class' ? 'first  first   external' : 'margin: 2px; color: blue'
    for (const element of [document.documentElement, document.body])
      element.setAttribute(name, external)
    entry.dispose()
    head.render()

    for (const element of [document.documentElement, document.body])
      expect(element.getAttribute(name)).toBe(external)
  })

  it.each(disabledAttributes)('omits %s on the first client render', (value) => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = createClientHead({ document })
    head.push(inputFor(name, value))
    head.render()

    for (const element of [document.querySelector('#asset')!, document.documentElement, document.body])
      expect(element.hasAttribute(name)).toBe(false)
  })

  it.each(disabledAttributes)('removes raw values after hydration when changed to %s', (value) => {
    const input = inputFor(name, name === 'class' ? 'asset loaded' : 'color:red;display:grid')
    const server = createServerHead({ disableDefaults: true })
    server.push(input)
    const html = renderSSRHead(server)
    const document = new JSDOM(`<html${html.htmlAttrs}><head>${html.headTags}</head><body${html.bodyAttrs}></body></html>`).window.document
    const asset = document.querySelector('#asset')!
    const head = createClientHead({ document })
    const entry = head.push(input)
    head.render()
    expect(document.querySelector('#asset')).toBe(asset)

    entry.patch(inputFor(name, value))
    head.render()

    expect(document.querySelectorAll('#asset')).toHaveLength(1)
    expect(document.querySelector('#asset')).toBe(asset)
    expect(asset.hasAttribute(name)).toBe(false)
    for (const element of [document.documentElement, document.body])
      expect(element.getAttribute(name) || '').toBe('')
  })
})

describe('literal attribute replacement', () => {
  it.each(['literal', 'structured'])('preserves exact class whitespace and duplicates after patching %s tokens', (kind) => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = createClientHead({ document })
    const entry = head.push(kind === 'literal'
      ? inputFor('class', 'first old')
      : {
          script: [{ attrs: { id: 'asset', class: 'first old' } }],
          htmlAttrs: { class: ['first', 'old'] },
          bodyAttrs: { class: ['first', 'old'] },
        })
    head.render()

    entry.patch(inputFor('class', 'first  first   new'))
    head.render()

    for (const element of [document.querySelector('#asset')!, document.documentElement, document.body])
      expect(element.getAttribute('class')).toBe('first  first   new')
  })

  it.each([
    [{ margin: '1px' }, 'margin-left: 2px', 'margin-left'],
    [{ 'margin-left': '1px' }, 'margin: 2px', 'margin'],
  ] as const)('retires structured style cleanup before writing %s to %s', (style, literal, property) => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = createClientHead({ document })
    const entry = head.push({
      htmlAttrs: { style },
      bodyAttrs: { style },
    })
    head.render()

    entry.patch({ htmlAttrs: { attrs: { style: literal } }, bodyAttrs: { attrs: { style: literal } } })
    head.render()

    for (const element of [document.documentElement, document.body]) {
      expect(element.getAttribute('style')).toBe(literal)
      expect((element as HTMLElement).style.getPropertyValue(property)).toBe('2px')
    }
  })
})
