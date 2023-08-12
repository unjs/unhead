import { HasElementTags, TagsWithInnerContent, hashTag, tagDedupeKey } from '@unhead/shared'
import type {
  DomBeforeRenderCtx,
  DomRenderTagContext,
  DomState,
  HeadTag,
  Unhead,
} from '@unhead/schema'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

function elementToTag($el: Element) {
  const props = $el.getAttributeNames()
    .reduce((props, name) => ({ ...props, [name]: $el.getAttribute(name) }), {})
  const tag: HeadTag = { tag: $el.tagName.toLowerCase() as HeadTag['tag'], props }
  const d = tagDedupeKey(tag)
  if (d)
    tag._d = d
  if ($el.innerHTML)
    tag.innerHTML = $el.innerHTML
  return tag
}

function elForTag(tag: HeadTag, dom: Document) {
  if (tag.tag === 'htmlAttrs')
    return dom.documentElement
  if (tag.tag === 'bodyAttrs')
    return dom.body
  if (tag.tag === 'title')
    return dom.head.querySelector('title')
}

/**
 * Render the head tags to the DOM.
 */
export async function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}) {
  const dom: Document | undefined = options.document || head.resolvedOptions.document
  if (!dom)
    return

  const tags: DomRenderTagContext[] = (await head.resolveTags())
    .map(tag => <DomRenderTagContext> {
      $el: elForTag(tag, dom),
      tag,
      id: HasElementTags.includes(tag.tag) ? hashTag(tag) : tag.tag,
      shouldRender: true,
    })

  const beforeRenderCtx: DomBeforeRenderCtx = { shouldRender: true, tags }
  await head.hooks.callHook('dom:beforeRender', beforeRenderCtx)
  // allow integrations to block to the render
  if (!beforeRenderCtx.shouldRender)
    return

  let state = head._dom as DomState
  // let's hydrate - fill the elMap for fast lookups
  if (!state) {
    state = { elMap: {} } as DomState
    for (const key of ['body', 'head']) {
      const children = dom?.[key as 'head' | 'body']?.children
      for (const c of [...children].filter(c => HasElementTags.includes(c.tagName.toLowerCase())))
        state.elMap[c.getAttribute('data-hid') || hashTag(elementToTag(c))] = c
    }
  }

  // presume all side effects are stale, we mark them as not stale if they're re-introduced
  state.pendingSideEffects = { ...state.sideEffects || {} }
  state.sideEffects = {}

  function setAttrs(ctx: DomRenderTagContext, sideEffects = false) {
    const tag = ctx.tag
    const $el = ctx.$el!
    // add new attributes
    Object.entries(tag.props).forEach(([k, value]) => {
      value = String(value)
      const attrSdeKey = `attr:${k}`
      // class attributes have their own side effects to allow for merging
      if (k === 'class') {
        // if the user is providing an empty string, then it's removing the class
        // the side effect clean up should remove it
        for (const c of (value || '').split(' ').filter(Boolean)) {
          // always clear side effects
          sideEffects && trackSideEffect(ctx, `${attrSdeKey}:${c}`, () => $el.classList.remove(c))
          !$el.classList.contains(c) && $el.classList.add(c)
        }
        return
      }
      if (sideEffects && !(k as string).startsWith('data-h-'))
        trackSideEffect(ctx, attrSdeKey, () => $el.removeAttribute(k))

      // attribute values get set directly
      $el.getAttribute(k) !== value && $el.setAttribute(k, value)
    })
    if (TagsWithInnerContent.includes(tag.tag)) {
      if (tag.textContent && tag.textContent !== $el.textContent)
        $el.textContent = tag.textContent
      else if (tag.innerHTML && (tag.innerHTML !== $el.innerHTML))
        $el.innerHTML = tag.innerHTML
    }
  }

  function trackSideEffect({ id }: DomRenderTagContext, scope: string, fn: () => void) {
    state.sideEffects[`${id}:${scope}`] = fn
    delete state.pendingSideEffects[`${id}:${scope}`]
  }

  function setupTagElement(ctx: DomRenderTagContext) {
    setAttrs(ctx)
    // @ts-expect-error untyped
    state.elMap[ctx.id] = ctx.$el
    // we are removing an element
    trackSideEffect(ctx, 'el', () => {
      state.elMap[ctx.id].remove()
      delete state.elMap[ctx.id]
    })
  }

  const pendingRenders: DomRenderTagContext[] = []
  const fragments: Record<Required<HeadTag>['tagPosition'], undefined | DocumentFragment> = {
    bodyClose: undefined,
    bodyOpen: undefined,
    head: undefined,
  } as const

  // first render all tags which we can match quickly
  for (const ctx of tags) {
    await head.hooks.callHook('dom:beforeRenderTag', ctx)
    const { tag, shouldRender, id } = ctx
    if (!shouldRender)
      continue
    // 1. render tags which don't create a new element
    if (tag.tag === 'title') {
      const prevTitle = dom.title
      dom.title = tag.textContent || ''
      trackSideEffect(ctx, 'el', () => { dom.title = prevTitle })
      continue
    }
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      setAttrs(ctx, true)
      continue
    }
    ctx.$el = ctx.$el || state.elMap[id]
    if (ctx.$el)
      setupTagElement(ctx)
    else
    // tag does not exist, we need to render it (if it's an element tag)
      HasElementTags.includes(tag.tag) && pendingRenders.push(ctx)
  }
  // 3. render tags which require a dom element to be created or requires scanning DOM to determine duplicate
  for (const ctx of pendingRenders) {
    // finally, we are free to make new elements
    const pos = ctx.tag.tagPosition || 'head'
    fragments[pos] = fragments[pos] || dom.createDocumentFragment()
    ctx.$el = dom.createElement(ctx.tag.tag)
    setupTagElement(ctx)
    fragments[pos]!.appendChild(ctx.$el)
    ctx.markSideEffect = (scope: string, fn: () => void) => trackSideEffect(ctx, scope, fn)
    await head.hooks.callHook('dom:renderTag', ctx, dom)
  }
  // finally, write the tags
  fragments.head && dom.head.appendChild(fragments.head)
  fragments.bodyOpen && dom.body.insertBefore(fragments.bodyOpen, dom.body.firstChild)
  fragments.bodyClose && dom.body.appendChild(fragments.bodyClose)

  // clear all side effects still pending
  Object.values(state.pendingSideEffects).forEach(fn => fn())
  head._dom = state
  await head.hooks.callHook('dom:rendered', { renders: tags })
}
