import { TagsWithInnerContent } from '@unhead/shared'
import type { DomRenderTagContext } from '@unhead/schema'

/**
 * Set attributes on a DOM element, while adding entry side effects.
 */
export const setAttrs = (ctx: DomRenderTagContext, newEntry = false, markSideEffect?: (ctx: DomRenderTagContext, k: string, fn: () => void) => void) => {
  const { tag, $el } = ctx
  if (!$el)
    return
  // add new attributes
  Object.entries(tag.props).forEach(([k, value]) => {
    value = String(value)
    const attrSdeKey = `attr:${k}`
    // class attributes have their own side effects to allow for merging
    if (k === 'class') {
      // if the user is providing an empty string then it's removing the class
      // the side effect clean up should remove it
      if (!value)
        return
      for (const c of value.split(' ')) {
        const classSdeKey = `${attrSdeKey}:${c}`
        // always clear side effects
        if (markSideEffect)
          markSideEffect(ctx, classSdeKey, () => $el.classList.remove(c))

        if (!$el.classList.contains(c))
          $el.classList.add(c)
      }
      return
    }
    // always clear side effects
    if (markSideEffect && !k.startsWith('data-h-'))
      markSideEffect(ctx, attrSdeKey, () => $el.removeAttribute(k))

    if (newEntry || $el.getAttribute(k) !== value)
      $el.setAttribute(k, value)
  })
  // @todo test side effects?
  if (TagsWithInnerContent.includes(tag.tag)) {
    if (tag.textContent && tag.textContent !== $el.textContent)
      $el.textContent = tag.textContent
    else if (tag.innerHTML && (tag.innerHTML !== $el.innerHTML))
      $el.innerHTML = tag.innerHTML
  }
}
