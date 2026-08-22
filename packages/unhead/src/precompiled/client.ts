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
  _b: Map<number, PrecompiledClientBindings>
  /** @internal */
  _r?: PrecompiledClientTag[]
  /** @internal */
  _set: (id: number, input: PrecompiledClientInput) => void
  /** @internal */
  _s?: PrecompiledDomState
  push: (input: PrecompiledClientInput, bindings?: readonly (() => unknown)[], batch?: 0) => PrecompiledClientEntry
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

/** @internal */
export interface PrecompiledClientBindings {
  getters: readonly (() => unknown)[]
  values: unknown[]
  plan: PrecompiledClientInput
}

/** @internal */
// eslint-disable-next-line no-control-regex -- NUL-free slot token delimiter
const CLIENT_TOKEN_RE = /\x01[TA](\d+)\x01/g

/** Replace slot tokens in a plan with materialized values (fresh tuple refs). @internal */
function materializePlan(plan: PrecompiledClientInput, values: unknown[]): PrecompiledClientInput {
  const next = plan.slice()
  for (let i = 0; i < plan.length; i++) {
    const tag = plan[i]
    let clone: any[] | undefined
    const props = tag[3]
    if (props) {
      let propsClone: Record<string, any> | undefined
      for (const prop in props) {
        if (typeof props[prop] === 'string' && (props[prop] as string).includes('\x01')) {
          propsClone ??= { ...props }
          propsClone[prop] = (props[prop] as string).replace(CLIENT_TOKEN_RE, ((_m: string, index: string) => values[+index]) as any)
        }
      }
      if (propsClone) {
        clone ??= [...tag] as any[]
        clone[3] = propsClone
      }
    }
    if (typeof tag[4] === 'string' && (tag[4] as string).includes('\x01')) {
      clone ??= [...tag] as any[]
      clone[4] = (tag[4] as string).replace(CLIENT_TOKEN_RE, (_, index) => {
        const val = values[+index]
        return val == null || val === false ? '' : String(val)
      })
    }
    if (clone)
      next[i] = clone as unknown as PrecompiledClientTag
  }
  return next
}

/** Evaluate slotted getters, rematerialize changed entries, drop the resolve cache. @internal */
function refreshSlots(head: PrecompiledClientHead): void {
  if (!head._b.size)
    return
  let changed = false
  for (const [id, binding] of head._b) {
    const values = binding.getters.map(getter => getter())
    let diff = false
    for (let i = 0; i < values.length; i++) {
      if (values[i] !== binding.values[i]) {
        diff = true
        break
      }
    }
    if (diff) {
      binding.values = values
      head._e.set(id, materializePlan(binding.plan, values))
      changed = true
    }
  }
  if (changed)
    head._r = undefined
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

  refreshSlots(head)

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

function push(head: PrecompiledClientHead, input: PrecompiledClientInput, bindings: readonly (() => unknown)[] | undefined, shouldRender: boolean): PrecompiledClientEntry {
  const id = ++head._c
  if (bindings) {
    const values = bindings.map(getter => getter())
    head._b.set(id, { getters: bindings, plan: input, values })
    head._e.set(id, materializePlan(input, values))
  }
  else {
    head._e.set(id, input)
  }
  head._r = undefined
  if (shouldRender)
    head.render()
  return {
    dispose() {
      head._b.delete(id)
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
    _b: new Map<number, PrecompiledClientBindings>(),
    _e: new Map<number, PrecompiledClientInput>(),
    _set(id: number, input: PrecompiledClientInput) {
      // re-activating a slotted entry: materialize the token-bearing plan with
      // its current values so fresh tuple refs re-sync the DOM
      const binding = head._b.get(id)
      head._e.set(id, binding && input === binding.plan ? materializePlan(binding.plan, binding.values) : input)
      head._r = undefined
    },
    push(input: PrecompiledClientInput, bindingsOrBatch?: readonly (() => unknown)[] | 0, batch?: 0) {
      return push(head, input, Array.isArray(bindingsOrBatch) ? bindingsOrBatch : undefined, (bindingsOrBatch === 0 ? 0 : batch) !== 0)
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
