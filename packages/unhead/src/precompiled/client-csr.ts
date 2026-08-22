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
  _b: Map<number, CsrBindings>
  /** @internal */
  _r?: PrecompiledClientTag[]
  /** @internal */
  _set: (id: number, input: PrecompiledClientInput) => void
  /** @internal */
  _s?: PrecompiledCsrDomState
  push: (input: PrecompiledClientInput, bindings?: readonly (() => unknown)[], batch?: 0) => PrecompiledClientEntry
  render: () => boolean
}

/** @internal */
interface CsrBindings {
  getters: readonly (() => unknown)[]
  values: unknown[]
  plan: PrecompiledClientInput
}

/** @internal */
// eslint-disable-next-line no-control-regex -- NUL-free slot token delimiter
const CSR_TOKEN_RE = /\x01[TA](\d+)\x01/g

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
          propsClone[prop] = (props[prop] as string).replace(CSR_TOKEN_RE, ((_m: string, index: string) => values[+index]) as any)
        }
      }
      if (propsClone) {
        clone ??= [...tag] as any[]
        clone[3] = propsClone
      }
    }
    if (typeof tag[4] === 'string' && (tag[4] as string).includes('\x01')) {
      clone ??= [...tag] as any[]
      clone[4] = (tag[4] as string).replace(CSR_TOKEN_RE, (_, index) => {
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
function refreshSlots(head: PrecompiledCsrClientHead): void {
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

function resolveTags(head: PrecompiledCsrClientHead): PrecompiledClientTag[] {
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

function render(head: PrecompiledCsrClientHead): boolean {
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
      setProps(el, props)
      continue
    }
    let el = state.elements.get(key)
    // Plan tuples are shared readonly references: when the winning tuple did
    // not change since the last render, the DOM state matches and all writes
    // can be skipped. External DOM edits made between renders are not repaired
    // until the plan changes.
    if (state.elements.has(key) && state.tags.get(key) === tag)
      continue
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

function push(head: PrecompiledCsrClientHead, input: PrecompiledClientInput, bindings: readonly (() => unknown)[] | undefined, shouldRender: boolean): PrecompiledClientEntry {
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

/** Create a SPA-only client head that never scans or adopts initial DOM nodes. @experimental */
export function createHead(): PrecompiledCsrClientHead {
  const head = {
    _c: 0,
    _b: new Map<number, CsrBindings>(),
    _e: new Map<number, PrecompiledClientInput>(),
    _set(id: number, input: PrecompiledClientInput) {
      const binding = head._b.get(id)
      head._e.set(id, binding && input === binding.plan ? materializePlan(binding.plan, binding.values) : input)
      head._r = undefined
    },
    push(input: PrecompiledClientInput, bindingsOrBatch?: readonly (() => unknown)[] | 0, batch?: 0) {
      return push(head, input, Array.isArray(bindingsOrBatch) ? bindingsOrBatch : undefined, (bindingsOrBatch === 0 ? 0 : batch) !== 0)
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
