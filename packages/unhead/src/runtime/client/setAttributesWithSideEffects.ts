import type { HeadTag } from '@unhead/schema'
import type { HeadEntry } from '../../types'

/**
 * Set attributes on a DOM element, while adding entry side effects.
 */
export function setAttributesWithSideEffects($el: Element, entry: HeadEntry<any>, tag: HeadTag) {
  const attrs = tag.props || {}
  const sdeKey = `${tag._p}:attr`

  // clean-up attribute side effects first
  Object.entries(entry._sde!)
    // only attribute based side effects
    .filter(([key]) => key.startsWith(sdeKey))
    // remove then and run the cleanup
    .forEach(([key, fn]) => delete entry._sde![key] && fn())

  // add new attributes
  Object.entries(attrs).forEach(([k, value]) => {
    value = String(value)
    const attrSdeKey = `${sdeKey}:${k}`
    // try and keep existing class and style props by appending data
    if (k === 'class') {
      for (const c of value.split(' ')) {
        if (!$el.classList.contains(c)) {
          $el.classList.add(c)
          entry._sde![`${attrSdeKey}:${c}`] = () => $el.classList.remove(c)
        }
      }
      return
    }
    if ($el.getAttribute(k) !== value) {
      $el.setAttribute(k, value)
      if (!k.startsWith('data-h-'))
        entry._sde![attrSdeKey] = () => $el.removeAttribute(k)
    }
  })
}
