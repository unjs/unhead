import type { HeadTag } from '@unhead/schema'
import type { SideEffectsRecord } from '../../types'

export const setAttributes = ($el: Element, tag: HeadTag) => {
  const sideEffects: SideEffectsRecord = {}
  const attrs = tag.props || {}

  // add new attributes
  for (const k in attrs) {
    // try and keep existing class and style props by appending data
    if (k === 'class') {
      for (const c of attrs[k].split(' ')) {
        if (!$el.classList.contains(c)) {
          $el.classList.add(c)
          sideEffects[`${tag._p}:attr:class:remove:${c}`] = () => {
            $el.classList.remove(c)
          }
        }
      }
      continue
    }
    $el.setAttribute(k, String(attrs[k]))
    if (!k.startsWith('data-h-')) {
      sideEffects[`${tag._p}:attr:${k}:remove`] = () => {
        $el.removeAttribute(k)
      }
    }
  }
  return sideEffects
}
