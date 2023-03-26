import { HasElementTags, TagsWithInnerContent, tagHash, tagDedupeKey } from '@unhead/shared'
import type {
  BeforeDOMRenderContext,
  DomRenderTagContext,
  HeadTag, ResolvedHeadTag,
  SideEffectsRecord,
  Unhead,
} from '@unhead/schema'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

const state = {
  sideEffects: {} as SideEffectsRecord,
  elMap: {} as Record<string, Element>,
}

/**
 * Render the head tags to the DOM.
 */
export async function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}) {
  const dom: Document = options.document || head.resolvedOptions.document || window.document

  const tags: DomRenderTagContext[] = (await head.resolveTags()).map((tag: ResolvedHeadTag) => <DomRenderTagContext> { $el: null, tag })

  const beforeRenderCtx: BeforeDOMRenderContext = { shouldRender: true, tags }
  await head.hooks.callHook('dom:beforeRender', beforeRenderCtx)
  // allow integrations to block to the render
  if (!beforeRenderCtx.shouldRender)
    return

  // queue everything to be deleted, and then we'll conditionally remove side effects which we don't want to fire
  // run queued side effects immediately

  // presume all side effects are stale, we mark them as not stale if they're re-introduced
  const pendingSideEffects: SideEffectsRecord = { ...state.sideEffects }
  // we'll rebuild the side effects as we render
  state.sideEffects = {}
  state.elMap = {}

  const pendingRenders: Record<'body' | 'head', DomRenderTagContext[]> = {
    body: [],
    head: [],
  }
  const fragments: Record<Required<HeadTag>['tagPosition'], undefined | DocumentFragment> = {
    bodyClose: undefined,
    bodyOpen: undefined,
    head: undefined,
  } as const

  function trackSideEffect(ctx: DomRenderTagContext, scope: string, fn: () => void) {
    // may not have an entry for some reason
    state.sideEffects[ctx.tag._e!] = fn
    delete pendingSideEffects[`${ctx.tag._h}:${scope}`]
  }

  function trackElSideEffects(ctx: DomRenderTagContext, $el?: Element) {
    ctx.$el = ctx.$el || $el
    setAttrs(ctx, ctx.$el!)
    state.elMap[ctx.tag._h] = ctx.$el!
    // we are removing an element
    trackSideEffect(ctx, 'el', () => {
      ctx.$el?.remove()
      delete state.elMap[ctx.tag._h]
    })
  }

  function setAttrs(ctx: DomRenderTagContext, $el: Element, sideEffects = false) {
    const tag = ctx.tag
    // add new attributes
    Object.entries(tag.props).forEach(([k, value]) => {
      value = String(value)
      const attrSdeKey = `attr:${k}`
      // class attributes have their own side effects to allow for merging
      if (k === 'class') {
        // if the user is providing an empty string, then it's removing the class
        // the side effect clean up should remove it
        for (const c of (value || '').split(' ')) {
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

  // first render all tags which we can match quickly
  for (const ctx of tags) {
    const { tag } = ctx

    // 1. render tags which don't create a new element
    if (tag.tag === 'title') {
      // we don't handle title side effects
      dom.title = tag.textContent || ''
      continue
    }
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      setAttrs(ctx, dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body'], true)
      continue
    }
    // 2. Hydrate based on either SSR or CSR mapping
    let $el: Element | null = state.elMap[ctx.tag._h]
    // try hydrate based on the SSR key
    if (!$el && tag.key)
      $el = dom.querySelector(`${tag.tagPosition?.startsWith('body') ? 'body' : 'head'} > ${tag.tag}[data-h-${tag._h}]`)

    // tag exists, we don't need to re-render it, just track side effects of the $el itself
    if ($el) {
      trackElSideEffects(ctx, $el)
      continue
    }

    // tag does not exist, we need to render it (if it's an element tag)
    if (HasElementTags.includes(tag.tag))
      pendingRenders[tag.tagPosition?.startsWith('body') ? 'body' : 'head'].push(ctx)
  }
  // 3. render tags which require a dom element to be created or requires scanning DOM to determine duplicate
  for (const [pos, queue] of Object.entries(pendingRenders) as [keyof typeof pendingRenders, DomRenderTagContext[]][]) {
    const children = dom?.[pos as 'head' | 'body']?.children
    if (!children || !(queue as []).length)
      continue

    // 3a. try and find a matching existing element (we only scan the DOM once per render tree)
    for (const $el of [...children].reverse()) {
      const elTag = $el.tagName.toLowerCase() as HeadTag['tag']

      // create a virtual tag that we can compare against
      const props = $el.getAttributeNames()
        .reduce((props, name) => ({ ...props, [name]: $el.getAttribute(name) }), {})
      const tmpTag: HeadTag = { tag: elTag, props }
      if ($el.innerHTML)
        tmpTag.innerHTML = $el.innerHTML

      const tmpTagHash = tagHash(tmpTag)
      // avoid using DOM API, let's use our own hash verification
      let matchIdx = queue.findIndex(ctx => ctx?.tag._h === tmpTagHash)
      // there was no match for the index, we need to do a more expensive lookup
      if (matchIdx === -1) {
        const tmpDedupeKey = tagDedupeKey(tmpTag)
        // avoid using DOM API, let's use our own hash verification
        matchIdx = queue.findIndex(ctx => ctx?.tag._d && ctx.tag._d === tmpDedupeKey)
      }

      // we found a match, let's hydrate it
      if (matchIdx !== -1) {
        const ctx = queue[matchIdx]
        // we need to track the side effects of the element
        trackElSideEffects(ctx, $el)
        delete queue[matchIdx]
      }
    }

    // finally, we are free to make new elements
    for (const ctx of queue.filter(Boolean) as DomRenderTagContext[]) {
      const pos = ctx.tag.tagPosition || 'head'
      fragments[pos] = fragments[pos] || dom.createDocumentFragment()
      trackElSideEffects(ctx, ctx.$el || dom.createElement(ctx.tag.tag))
      fragments[pos]!.appendChild(ctx.$el!)
    }
  }
  // finally, write the tags
  fragments.head && dom.head.appendChild(fragments.head)
  fragments.bodyOpen && dom.body.insertBefore(fragments.bodyOpen, dom.body.firstChild)
  fragments.bodyClose && dom.body.appendChild(fragments.bodyClose)

  for (const ctx of tags)
    await head.hooks.callHook('dom:renderTag', ctx)

  // clear all side effects still pending
  Object.values(pendingSideEffects).forEach(fn => fn())
}
