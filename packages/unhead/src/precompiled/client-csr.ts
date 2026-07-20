import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import type { PrecompiledClientEntry, PrecompiledClientInput, PrecompiledClientTag } from './client'

interface PrecompiledCsrDomState {
  document: Document
  elements: Map<string, Element>
  tags: Map<string, PrecompiledClientTag>
  title: string
}

export interface PrecompiledCsrClientHead {
  /** @internal */
  _c: number
  /** @internal */
  _e: Map<number, PrecompiledClientInput>
  /** @internal */
  _s?: PrecompiledCsrDomState
  push: (input: PrecompiledClientInput) => PrecompiledClientEntry
  render: () => boolean
}

function resolveTags(head: PrecompiledCsrClientHead): PrecompiledClientTag[] {
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

function render(head: PrecompiledCsrClientHead): boolean {
  const document = globalThis.document
  if (!document)
    return false

  let state = head._s
  if (state?.document !== document) {
    state = undefined
    head._s = undefined
  }
  if (!state) {
    state = { document, elements: new Map(), tags: new Map(), title: document.title }
    head._s = state
  }

  const next = new Map<string, PrecompiledClientTag>()
  const pending: [Element, 1 | 2 | undefined][] = []
  for (const tag of resolveTags(head)) {
    const [,, name, props, content, position, isHTML] = tag
    const key = tag[1]
    next.set(key, tag)
    if (!name) {
      if (key === 'title') {
        document.title = ''
      }
      else {
        state.elements.get(key)?.remove()
        state.elements.delete(key)
      }
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
        if (value === false || value === null) {
          el.removeAttribute(prop)
        }
        else {
          const next = value === true ? '' : String(value)
          if (el.getAttribute(prop) !== next)
            el.setAttribute(prop, next)
        }
      }
      continue
    }
    let el = state.elements.get(key)
    if (!el) {
      el = document.createElement(name)
      state.elements.set(key, el)
      if (position === 1)
        pending.unshift([el, position])
      else
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
      if (value === false || value === null) {
        el.removeAttribute(prop)
      }
      else {
        const next = value === true ? '' : String(value)
        if (el.getAttribute(prop) !== next)
          el.setAttribute(prop, next)
      }
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
    else if (previous?.[4] !== undefined) {
      el.textContent = ''
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

function push(head: PrecompiledCsrClientHead, input: PrecompiledClientInput, shouldRender: boolean): PrecompiledClientEntry {
  const id = ++head._c
  head._e.set(id, input)
  if (shouldRender)
    head.render()
  return {
    dispose() {
      if (head._e.delete(id))
        head.render()
    },
  }
}

/** Create a SPA-only client head that never scans or adopts initial DOM nodes. @experimental */
export function createHead(): PrecompiledCsrClientHead {
  const head = {
    _c: 0,
    _e: new Map<number, PrecompiledClientInput>(),
    push(input: PrecompiledClientInput, batch?: 0) {
      return push(head, input, batch !== 0)
    },
    render: () => render(head),
  } as PrecompiledCsrClientHead
  return head
}

/** Add one build-finalized SPA-only client entry. @experimental */
export function useHead(input: ResolvableHead, options: { head: PrecompiledCsrClientHead }): PrecompiledClientEntry {
  return options.head.push(input as unknown as PrecompiledClientInput)
}

/** Add one build-finalized static SPA-only SEO entry. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: PrecompiledCsrClientHead }) => PrecompiledClientEntry

/** Render all active build-finalized SPA-only entries into the document. @experimental */
export function renderDOMHead(head: PrecompiledCsrClientHead): boolean {
  return head.render()
}
