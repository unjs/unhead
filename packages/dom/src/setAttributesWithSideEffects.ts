import type { HeadClient, HeadEntry, HeadTag } from '@unhead/schema'

/**
 * Set attributes on a DOM element, while adding entry side effects.
 */
export function setAttributesWithSideEffects(head: HeadClient, $el: Element, entry: HeadEntry<any>, tag: HeadTag) {
  const attrs = tag.props || {}
  const sdeKey = `${tag._p}:attr`

  const sdeToRun = { ...entry._sde }

  // add new attributes
  Object.entries(attrs).forEach(([k, value]) => {
    value = String(value)
    const attrSdeKey = `${sdeKey}:${k}`
    head._removeQueuedSideEffect(attrSdeKey)
    delete sdeToRun[attrSdeKey]
    // try and keep existing class and style props by appending data
    if (k === 'class') {
      for (const c of value.split(' ')) {
        const classSdeKey = `${sdeKey}:class:${c}`
        if (!$el.classList.contains(c)) {
          $el.classList.add(c)
          entry._sde![classSdeKey] = () => $el.classList.remove(c)
        }
        head._removeQueuedSideEffect(classSdeKey)
        delete sdeToRun[classSdeKey]
      }
      return
    }
    if ($el.getAttribute(k) !== value) {
      $el.setAttribute(k, value)
      if (!k.startsWith('data-h-'))
        entry._sde![attrSdeKey] = () => $el.removeAttribute(k)
    }
  })

  // less aggressive clean up of entry side effect attributes
  Object.entries(sdeToRun)
    // only attribute based side effects
    .filter(([key]) => key.startsWith(sdeKey))
    // remove then and run the cleanup
    .forEach(([key, fn]) => {
      delete entry._sde![key] && fn()
    })
}
