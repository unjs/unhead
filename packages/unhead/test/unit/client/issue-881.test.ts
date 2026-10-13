import { renderDOMHead } from '@unhead/dom'
import { describe, expect, it } from 'vitest'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../util'

// Browsers enumerate CSSStyleDeclaration longhands only (style="margin: 0" yields
// margin-top/right/bottom/left, never 'margin'). cssstyle (jsdom) keeps the shorthand,
// which hides shorthand-claim bugs, so these tests run against a declaration that
// enumerates longhands only.
const MARGIN_LONGHANDS = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']

function longhandOnlyStyle(initial: Record<string, string> = {}) {
  const props = new Map<string, string>()
  const expand = (property: string) => property === 'margin' ? MARGIN_LONGHANDS : [property]
  const style = {
    get length() {
      return props.size
    },
    item(i: number) {
      return [...props.keys()][i] ?? ''
    },
    getPropertyValue(property: string) {
      return props.get(property) ?? ''
    },
    setProperty(property: string, value: string) {
      for (const k of expand(property)) {
        if (value === '')
          props.delete(k)
        else
          props.set(k, value)
      }
    },
    removeProperty(property: string) {
      for (const k of expand(property)) props.delete(k)
    },
    get cssText() {
      return [...props].map(([k, v]) => `${k}: ${v};`).join(' ')
    },
  }
  for (const [k, v] of Object.entries(initial)) style.setProperty(k, v)
  return style
}

function withLonghandStyle(el: HTMLElement, initial: Record<string, string>) {
  Object.defineProperty(el, 'style', { value: longhandOnlyStyle(initial) })
  return el.style as unknown as ReturnType<typeof longhandOnlyStyle>
}

describe('issue 881 - adopted style shorthand claims', () => {
  it('keeps a re-declared shorthand margin on an adopted body', () => {
    const dom = useDom()
    const document = dom.window.document
    document.body.setAttribute('style', 'margin: 0')
    const style = withLonghandStyle(document.body, { 'margin-top': '0', 'margin-right': '0', 'margin-bottom': '0', 'margin-left': '0' })

    const head = createClientHeadWithContext({ document })
    head.push({ bodyAttrs: { style: { margin: '0' } } })

    expect(style.length).toBeGreaterThan(0)
    expect(style.cssText).toContain('margin-top: 0;')
  })

  it('retires seeded longhands when a shorthand claim expands over them', () => {
    const dom = useDom()
    const document = dom.window.document
    document.body.setAttribute('style', 'margin-top: 5px')
    const style = withLonghandStyle(document.body, { 'margin-top': '5px' })

    const head = createClientHeadWithContext({ document })
    head.push({ bodyAttrs: { style: { margin: '0' } } })

    expect(style.getPropertyValue('margin-top')).toBe('0')
  })
})

describe('issue 881 - style claims across renders', () => {
  it('keeps a longhand claim when it replaces a shorthand from the last render', () => {
    const dom = useDom()
    const document = dom.window.document
    const style = withLonghandStyle(document.body, {})

    const head = createClientHeadWithContext({ document })
    const entry = head.push({ bodyAttrs: { style: { margin: '10px' } } })
    entry.patch({ bodyAttrs: { style: { 'margin-top': '5px' } } })

    expect(style.getPropertyValue('margin-top')).toBe('5px')
    expect(style.getPropertyValue('margin-left')).toBe('10px')
  })

  it('keeps preserved longhands when an identical style claim re-renders', () => {
    const dom = useDom()
    const document = dom.window.document
    const style = withLonghandStyle(document.body, {})

    const head = createClientHeadWithContext({ document })
    const entry = head.push({ bodyAttrs: { style: { margin: '10px' } } })
    entry.patch({ bodyAttrs: { style: { 'margin-top': '5px' } } })
    entry.patch({ bodyAttrs: { style: { 'margin-top': '5px' } } })

    expect(style.getPropertyValue('margin-top')).toBe('5px')
    expect(style.getPropertyValue('margin-right')).toBe('10px')
    expect(style.getPropertyValue('margin-bottom')).toBe('10px')
    expect(style.getPropertyValue('margin-left')).toBe('10px')
  })

  it('removes prior shorthand longhands when the style is dropped later', () => {
    const dom = useDom()
    const document = dom.window.document
    const style = withLonghandStyle(document.body, {})

    const head = createClientHeadWithContext({ document })
    const entry = head.push({ bodyAttrs: { style: { margin: '10px' } } })
    entry.patch({ bodyAttrs: { style: { 'margin-top': '5px' } } })
    entry.patch({ bodyAttrs: {} })

    expect(style.length).toBe(0)
  })
})

describe('issue 881 - document without a body', () => {
  it('renders a title-only head into a body-less document', () => {
    const document = useDom().window.document
    document.body.remove()

    const head = createServerHeadWithContext()
    head.push({ title: 'Bodyless' })

    expect(renderDOMHead(head, { document })).toBe(true)
    expect(document.title).toBe('Bodyless')
  })

  it('renders a pending meta tag into a body-less document', () => {
    const document = useDom().window.document
    document.body.remove()

    const head = createClientHeadWithContext({ document })
    head.push({ meta: [{ name: 'viewport', content: 'width=device-width' }] })

    expect(document.head.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe('width=device-width')
  })

  it('drops body-position tags instead of crashing on a body-less document', () => {
    const document = useDom().window.document
    document.body.remove()

    const head = createClientHeadWithContext({ document })
    head.push({ script: [{ src: 'https://cdn.example.com/app.js', tagPosition: 'bodyClose' }] })

    expect(document.querySelector('script[src="https://cdn.example.com/app.js"]')).toBeNull()
  })

  it('ignores bodyAttrs seeds when the body is missing', () => {
    const document = useDom().window.document
    document.body.remove()

    const head = createClientHeadWithContext({ document })
    expect(() => head.push({ bodyAttrs: { class: 'page' } })).not.toThrow()
  })
})

describe('issue 881 - pre-hydration external attributes on html/body', () => {
  it('keeps externally added classes and attributes on html when only the baseline is claimed', () => {
    const document = useDom().window.document
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-my-app', '')

    const head = createClientHeadWithContext({ document })
    head.push({ htmlAttrs: { class: 'layout' } })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('layout')).toBe(true)
    expect(document.documentElement.hasAttribute('data-my-app')).toBe(true)
  })

  it('keeps externally added attributes on body while claiming baseline classes', () => {
    const document = useDom().window.document
    document.body.classList.add('theme-dark')
    document.body.setAttribute('data-template', '')

    const head = createClientHeadWithContext({ document })
    head.push({ bodyAttrs: { class: 'page' } })

    expect(document.body.classList.contains('theme-dark')).toBe(true)
    expect(document.body.classList.contains('page')).toBe(true)
    expect(document.body.hasAttribute('data-template')).toBe(true)
  })
})
