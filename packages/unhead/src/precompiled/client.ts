import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'

export type PrecompiledClientTag = readonly [
  weight: number,
  identity: string,
  tag: string,
  props: Readonly<Record<string, string | number | boolean | null>>,
  content?: string,
  position?: 1 | 2,
  innerHTML?: 1,
]

/** @internal */
export type PrecompiledClientInput = readonly PrecompiledClientTag[]

export interface PrecompiledClientEntry {
  dispose: () => void
}

interface PrecompiledDomState {
  document: Document
  elements: Map<string, Element>
  tags: Map<string, PrecompiledClientTag>
  title: string
}

export interface PrecompiledClientHead {
  /** @internal */
  _c: number
  /** @internal */
  _e: Map<number, PrecompiledClientInput>
  /** @internal */
  _s?: PrecompiledDomState
  push: (input: PrecompiledClientInput) => PrecompiledClientEntry
  render: () => boolean
}

function identity(el: Element): string | undefined {
  const tag = el.tagName.toLowerCase()
  if (tag === 'base' || tag === 'title')
    return tag
  if (el.hasAttribute('charset'))
    return 'charset'
  if (tag === 'meta') {
    for (const key of ['name', 'property', 'http-equiv']) {
      const value = el.getAttribute(key)
      if (value !== null)
        return `meta:${value}`
    }
  }
  const key = el.getAttribute('data-hid')
  if (key)
    return key
  const id = el.getAttribute('id')
  if (id)
    return `${tag}:id:${id}`
  if (tag === 'link') {
    const rel = el.getAttribute('rel')
    if (rel === 'canonical')
      return 'canonical'
    if (rel === 'alternate' && el.hasAttribute('hreflang'))
      return `alternate:${el.getAttribute('hreflang')}`
    const href = el.getAttribute('href')
    if (rel && href)
      return `link:${rel}:${href}`
  }
  const content = el.innerHTML
  if (content && (tag === 'script' || tag === 'style' || tag === 'noscript'))
    return `${tag}:content:${content}`
  const names = el.getAttributeNames().sort()
  let value = `${tag}:`
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const attribute = el.getAttribute(name)
    value += `${i ? ',' : ''}${name}:${attribute === '' && !name.startsWith('data-') ? 'true' : attribute}`
  }
  return value
}

function resolveTags(head: PrecompiledClientHead): PrecompiledClientTag[] {
  const tags: PrecompiledClientTag[] = []
  for (const plan of head._e.values()) {
    for (const tag of plan) tags.push(tag)
  }
  tags.sort((a, b) => a[0] - b[0])
  const resolved = new Map<string, PrecompiledClientTag>()
  for (const tag of tags) {
    const previous = resolved.get(tag[1])
    if (!previous || tag[2].endsWith('Attrs') || previous[0] === tag[0])
      resolved.set(tag[1], tag)
  }
  return [...resolved.values()]
}

function render(head: PrecompiledClientHead): boolean {
  const document = globalThis.document
  if (!document)
    return false

  let state = head._s
  if (state?.document !== document) {
    state = undefined
    head._s = undefined
  }
  if (!state) {
    const elements = new Map<string, Element>()
    for (const el of [...document.head.children, ...document.body.children]) {
      const key = identity(el)
      if (key && !elements.has(key))
        elements.set(key, el)
    }
    state = { document, elements, tags: new Map(), title: document.title }
    head._s = state
  }

  const next = new Map<string, PrecompiledClientTag>()
  const pending: [Element, 1 | 2 | undefined][] = []
  for (const tag of resolveTags(head)) {
    const [,, name, props, content, position, isHTML] = tag
    const key = tag[1]
    next.set(key, tag)
    if (!name) {
      state.elements.get(key)?.remove()
      state.elements.delete(key)
      continue
    }
    if (name === 'title') {
      if (document.title !== content)
        document.title = content || ''
      continue
    }
    if (name.endsWith('Attrs')) {
      const el = name === 'htmlAttrs' ? document.documentElement : document.body
      for (const prop in props) {
        const value = props[prop]
        if (value !== false && value !== null && el.getAttribute(prop) !== value)
          el.setAttribute(prop, value === true ? '' : String(value))
      }
      continue
    }
    let el = state.elements.get(key)
    if (!el) {
      el = document.createElement(name)
      state.elements.set(key, el)
      pending.push([el, position])
    }
    const previous = state.tags.get(key)
    if (previous && previous[2] === name) {
      for (const prop in previous[3]) {
        if (!(prop in props))
          el.removeAttribute(prop)
      }
    }
    for (const prop in props) {
      const value = props[prop]
      if (value !== false && value !== null && el.getAttribute(prop) !== value)
        el.setAttribute(prop, value === true ? '' : String(value))
    }
    if (content !== undefined) {
      if (isHTML) {
        if (el.innerHTML !== content)
          el.innerHTML = content
      }
      else if (el.textContent !== content) {
        el.textContent = content
      }
    }
  }

  for (const [key, tag] of state.tags) {
    if (next.has(key))
      continue
    const name = tag[2]
    if (name === 'title') {
      document.title = state.title
    }
    else if (name.endsWith('Attrs')) {
      const el = name === 'htmlAttrs' ? document.documentElement : document.body
      for (const prop in tag[3])
        el.removeAttribute(prop)
    }
    else {
      state.elements.get(key)?.remove()
      state.elements.delete(key)
    }
  }

  for (const [el, position] of pending) {
    if (position === 1)
      document.body.insertBefore(el, document.body.firstChild)
    else if (position === 2)
      document.body.appendChild(el)
    else
      document.head.appendChild(el)
  }
  state.tags = next
  return true
}

/** Create a capability-limited client head for build-finalized entries. @experimental */
export function createHead(): PrecompiledClientHead {
  const head = {
    _c: 0,
    _e: new Map<number, PrecompiledClientInput>(),
    push(input: PrecompiledClientInput) {
      const id = ++head._c
      head._e.set(id, input)
      head.render()
      return {
        dispose() {
          if (head._e.delete(id))
            head.render()
        },
      }
    },
    render: () => render(head),
  } as PrecompiledClientHead
  return head
}

/** Add one build-finalized client entry. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledClientHead }): PrecompiledClientEntry {
  return options.head.push(input as unknown as PrecompiledClientInput)
}

/** Add one build-finalized static SEO entry. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: PrecompiledClientHead }) => PrecompiledClientEntry

/** Render all active build-finalized entries into the document. @experimental */
export function renderDOMHead(head: PrecompiledClientHead): boolean {
  return head.render()
}
