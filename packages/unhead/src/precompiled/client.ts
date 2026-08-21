import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'

export type PrecompiledClientTag = readonly [
  weight: number,
  identity: string,
  tag: string,
  props: Readonly<Record<string, string | number | boolean | null>>,
  content?: string,
  position?: 1 | 2,
  innerHTML?: 1,
  adoptionIdentity?: string,
]

/** @internal */
export type PrecompiledClientInput = readonly PrecompiledClientTag[]

export interface PrecompiledClientEntry {
  dispose: () => void
}

interface PrecompiledDomState {
  adopted?: Map<string, Element[]>
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
  _r?: PrecompiledClientTag[]
  /** @internal */
  _set: (id: number, input: PrecompiledClientInput) => void
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
    let value = el.getAttribute('name')
    if (value !== null)
      return `meta:${value}`
    value = el.getAttribute('property')
    if (value !== null)
      return `meta:${value}`
    value = el.getAttribute('http-equiv')
    if (value !== null)
      return `meta:${value}`
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
  if (tag === 'script' || tag === 'style' || tag === 'noscript') {
    const content = el.innerHTML
    if (content)
      return `${tag}:content:${content}`
  }
  else if (tag !== 'meta' && tag !== 'link') {
    return
  }
  const names = el.getAttributeNames().sort()
  return `${tag}:${names.map((name) => {
    const attribute = el.getAttribute(name)
    return `${name}:${attribute === '' && !name.startsWith('data-') ? 'true' : attribute}`
  }).join(',')}`
}

function takeAdopted(state: PrecompiledDomState, key: string): Element | undefined {
  const value = state.adopted?.get(key)
  const el = value?.shift()
  if (value?.length === 0)
    state.adopted!.delete(key)
  return el
}

function resolveTags(head: PrecompiledClientHead): PrecompiledClientTag[] {
  // Entries only change on push/dispose, both of which drop the cache. Repeated
  // renders reuse the same sorted, deduped array (readonly shared plan tags).
  if (head._r)
    return head._r
  const tags: PrecompiledClientTag[] = []
  for (const plan of head._e.values()) {
    for (const tag of plan) tags.push(tag)
  }
  tags.sort((a, b) => a[0] - b[0])
  const deduped = new Map<string, PrecompiledClientTag>()
  for (const tag of tags) {
    const previous = deduped.get(tag[1])
    if (!previous || tag[2].endsWith('Attrs') || previous[0] === tag[0])
      deduped.set(tag[1], tag)
  }
  const resolved = [...deduped.values()]
  head._r = resolved
  return resolved
}

function setProps(el: Element, props: Record<string, string | number | boolean | null>) {
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
    const adopted = new Map<string, Element[]>()
    // element children only: text and comment nodes can never match an identity
    for (const parent of [document.head, document.body]) {
      for (let i = 0; i < parent.children.length; i++) {
        const el = parent.children[i]
        const key = identity(el)
        if (!key || key === 'title')
          continue
        const existing = adopted.get(key)
        if (existing)
          existing.push(el)
        else
          adopted.set(key, [el])
      }
    }
    state = { adopted, document, elements: new Map(), tags: new Map(), title: document.title }
    head._s = state
  }

  const next = new Map<string, PrecompiledClientTag>()
  const pending: [Element, 1 | 2 | undefined][] = []
  for (const tag of resolveTags(head)) {
    const [,, name, props, content, position, isHTML, adoptionIdentity] = tag
    const key = tag[1]
    next.set(key, tag)
    if (!name) {
      if (key === 'title') {
        document.title = ''
      }
      else {
        const el = state.elements.get(key) || takeAdopted(state, adoptionIdentity || key)
        el?.remove()
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
      setProps(el, props)
      continue
    }
    let el = state.elements.get(key)
    // Plan tuples are shared readonly references: when the winning tuple did
    // not change since the last render and the element was already synced, the
    // DOM state matches and all writes can be skipped. External DOM edits made
    // between renders are not repaired until the plan changes.
    const synced = !!el
    if (!el) {
      el = takeAdopted(state, adoptionIdentity || key) || document.createElement(name)
      state.elements.set(key, el)
      if (!el.isConnected || (position ? el.parentNode !== document.body : el.parentNode !== document.head)) {
        if (position === 1)
          pending.unshift([el, position])
        else
          pending.push([el, position])
      }
    }
    const previous = state.tags.get(key)
    if (!synced || previous !== tag) {
      if (previous && previous[2] === name) {
        for (const prop in previous[3]) {
          if (!(prop in props))
            el.removeAttribute(prop)
        }
      }
      setProps(el, props)
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

function push(head: PrecompiledClientHead, input: PrecompiledClientInput, shouldRender: boolean): PrecompiledClientEntry {
  const id = ++head._c
  head._e.set(id, input)
  head._r = undefined
  if (shouldRender)
    head.render()
  return {
    dispose() {
      if (head._e.delete(id)) {
        head._r = undefined
        head.render()
      }
    },
  }
}

/** Create a capability-limited client head for build-finalized entries. @experimental */
export function createHead(): PrecompiledClientHead {
  const head = {
    _c: 0,
    _e: new Map<number, PrecompiledClientInput>(),
    _set(id: number, input: PrecompiledClientInput) {
      head._e.set(id, input)
      head._r = undefined
    },
    push(input: PrecompiledClientInput, batch?: 0) {
      return push(head, input, batch !== 0)
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
