import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import type { PrecompiledClientInput, PrecompiledClientTag } from './client'

export interface PrecompiledClientSnapshotHead {
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
  let value = `${tag}:`
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const attribute = el.getAttribute(name)
    value += `${i ? ',' : ''}${name}:${attribute === '' && !name.startsWith('data-') ? 'true' : attribute}`
  }
  return value
}

function render(plan: PrecompiledClientInput): boolean {
  const document = globalThis.document
  if (!document)
    return false
  const elements = new Map<string, Element[]>()
  for (const el of document.querySelectorAll('head>*,body>*')) {
    const key = identity(el)
    if (!key || key === 'title')
      continue
    const existing = elements.get(key)
    if (existing)
      existing.push(el)
    else
      elements.set(key, [el])
  }
  const take = (key: string) => {
    const value = elements.get(key)
    const el = value?.shift()
    if (value?.length === 0)
      elements.delete(key)
    return el
  }
  const pending: [Element, 1 | 2 | undefined][] = []
  for (const tag of plan) {
    const [,, name, props, content, position, isHTML, adoptionIdentity] = tag
    const key = tag[1]
    if (!name) {
      if (key === 'title')
        document.title = ''
      else
        take(adoptionIdentity || key)?.remove()
      continue
    }
    if (name === 'title') {
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
    const el = take(adoptionIdentity || key) || document.createElement(name)
    if (!el.isConnected || (position ? el.parentNode !== document.body : el.parentNode !== document.head)) {
      if (position === 1)
        pending.unshift([el, position])
      else
        pending.push([el, position])
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
  }
  for (const [el, position] of pending) {
    if (position === 1)
      document.body.insertBefore(el, document.body.firstChild)
    else if (position === 2)
      document.body.appendChild(el)
    else
      document.head.appendChild(el)
  }
  return true
}

export function createHead(): PrecompiledClientSnapshotHead
export function createHead(plan?: PrecompiledClientInput): PrecompiledClientSnapshotHead {
  if (!plan)
    throw new Error('[unhead] snapshot calls must be compiled by @unhead/bundler')
  const head = { render: () => render(plan) }
  head.render()
  return head
}

function uncompiled(): never {
  throw new Error('[unhead] snapshot calls must be compiled by @unhead/bundler')
}

/** @experimental */
export function useHead(_input: ResolvableHead, _options: { head: PrecompiledClientSnapshotHead }): never {
  return uncompiled()
}

/** @experimental */
export const useSeoMeta = useHead as (_input: UseSeoMetaInput, _options: { head: PrecompiledClientSnapshotHead }) => never

/** Render the build-finalized client snapshot again. @experimental */
export function renderDOMHead(head: PrecompiledClientSnapshotHead): boolean {
  return head.render()
}

export type { PrecompiledClientInput, PrecompiledClientTag }
