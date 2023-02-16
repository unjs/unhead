import { HasElementTags, hashCode, tagDedupeKey } from '@unhead/shared'
import type {
  BeforeRenderContext,
  DomRenderTagContext,
  HeadTag,
  SideEffectsRecord,
  Unhead,
} from '@unhead/schema'
import { setAttrs } from './setAttrs'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

/**
 * Render the head tags to the DOM.
 */
export async function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}) {
  const ctx: BeforeRenderContext = { shouldRender: true }
  await head.hooks.callHook('dom:beforeRender', ctx)
  // allow integrations to block to the render
  if (!ctx.shouldRender)
    return

  const dom: Document = options.document || window.document

  // queue everything to be deleted, and then we'll conditionally remove side effects which we don't want to fire
  // run queued side effects immediately

  // presume all side effects are stale, we mark them as not stale if they're re-introduced
  const staleSideEffects: SideEffectsRecord = head._popSideEffectQueue()
  head.headEntries()
    .map(entry => entry._sde)
    .forEach((sde) => {
      Object.entries(sde).forEach(([key, fn]) => {
        staleSideEffects[key] = fn
      })
    })

  const setupTagRenderCtx = async (tag: HeadTag) => {
    const entry = head.headEntries().find(e => e._i === tag._e)
    const renderCtx: DomRenderTagContext = {
      renderId: tag._d || hashCode(JSON.stringify({ ...tag, _e: undefined, _p: undefined })),
      $el: null,
      shouldRender: true,
      tag,
      entry,
      staleSideEffects,
    }
    await head.hooks.callHook('dom:beforeRenderTag', renderCtx)
    return renderCtx
  }

  const renders: DomRenderTagContext[] = []
  const pendingRenders: Record<'body' | 'head', DomRenderTagContext[]> = {
    body: [],
    head: [],
  }

  const markSideEffect = (ctx: DomRenderTagContext, key: string, fn: () => void) => {
    key = `${ctx.renderId}:${key}`
    // may not have an entry for some reason
    if (ctx.entry)
      ctx.entry._sde[key] = fn
    delete staleSideEffects[key]
  }
  const markEl = (ctx: DomRenderTagContext) => {
    head._elMap[ctx.renderId] = ctx.$el!
    renders.push(ctx)
    markSideEffect(ctx, 'el', () => {
      ctx.$el?.remove()
      delete head._elMap[ctx.renderId]
    })
  }

  // first render all tags which we can match quickly
  for (const t of await head.resolveTags()) {
    const ctx = await setupTagRenderCtx(t)
    if (!ctx.shouldRender)
      continue
    const { tag } = ctx
    // 1. render tags which don't create a new element
    if (tag.tag === 'title') {
      // we don't handle title side effects
      dom.title = tag.children || ''
      renders.push(ctx)
      continue
    }
    if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      ctx.$el = dom[tag.tag === 'htmlAttrs' ? 'documentElement' : 'body']
      setAttrs(ctx, markSideEffect)
      renders.push(ctx)
      continue
    }
    // 2. Hydrate based on either SSR or CSR mapping
    ctx.$el = head._elMap[ctx.renderId]
    // @ts-expect-error runtime _hash untyped
    if (!ctx.$el && tag._hash) {
      // @ts-expect-error runtime _hash untyped
      ctx.$el = dom.querySelector(`${tag.tagPosition?.startsWith('body') ? 'body' : 'head'} > ${tag.tag}[data-h-${tag._hash}]`)
    }
    if (ctx.$el) {
      // if we don't have a dedupe keys then the attrs will be the same
      if (ctx.tag._d)
        setAttrs(ctx)
      markEl(ctx)
      continue
    }

    pendingRenders[tag.tagPosition?.startsWith('body') ? 'body' : 'head'].push(ctx)
  }

  const fragments: Record<Required<HeadTag>['tagPosition'], undefined | DocumentFragment> = {
    bodyClose: undefined,
    bodyOpen: undefined,
    head: undefined,
  } as const

  // 3. render tags which require a dom element to be created or requires scanning DOM to determine duplicate
  Object.entries(pendingRenders)
    .forEach(([pos, queue]) => {
      if (!queue.length)
        return
      const children = dom?.[pos as 'head' | 'body']?.children
      if (!children)
        return

      // 3a. try and find a matching existing element (we only scan the DOM once per render tree)
      for (const $el of [...children].reverse()) {
        const elTag = $el.tagName.toLowerCase() as HeadTag['tag']
        // only valid element tags
        if (!HasElementTags.includes(elTag))
          continue

        // convert attributes to object
        const props = $el.getAttributeNames()
          .reduce((props, name) => ({ ...props, [name]: $el.getAttribute(name) }), {})

        const tmpTag: HeadTag = { tag: elTag, props }

        const tmpRenderId = hashTag(tmpTag)
        // avoid using DOM API, let's use our own hash verification
        let matchIdx = queue.findIndex(ctx => ctx?.renderId === tmpRenderId)
        // there was no match for the index, we need to do a more expensive lookup
        if (matchIdx === -1) {
          const tmpDedupeKey = tagDedupeKey(tmpTag)
          // avoid using DOM API, let's use our own hash verification
          matchIdx = queue.findIndex(ctx => ctx?.tag._d && ctx.tag._d === tmpDedupeKey)
        }

        if (matchIdx !== -1) {
          const ctx = queue[matchIdx]
          ctx.$el = $el
          setAttrs(ctx)
          markEl(ctx)
          delete queue[matchIdx]
        }
      }

      queue.forEach((ctx) => {
        const pos = ctx.tag.tagPosition || 'head'
        fragments[pos] = fragments[pos] || dom.createDocumentFragment()
        if (!ctx.$el) {
          //  create the new dom element
          ctx.$el = dom.createElement(ctx.tag.tag)
          setAttrs(ctx)
        }
        fragments[pos]!.appendChild(ctx.$el!)
        markEl(ctx)
      })
    })
  // finally, write the tags
  if (fragments.head)
    dom.head.appendChild(fragments.head)

  if (fragments.bodyOpen)
    dom.body.insertBefore(fragments.bodyOpen, dom.body.firstChild)

  if (fragments.bodyClose)
    dom.body.appendChild(fragments.bodyClose)

  for (const ctx of renders)
    await head.hooks.callHook('dom:renderTag', ctx)

  // clear all side effects still pending
  Object.values(staleSideEffects).forEach(fn => fn())
}

/**
 * Global instance of the dom update promise. Used for debounding head updates.
 */
// eslint-disable-next-line import/no-mutable-exports
export let domUpdatePromise: Promise<void> | null = null

/**
 * Queue a debounced update of the DOM head.
 */
export async function debouncedRenderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions & { delayFn?: (fn: () => void) => void } = {}) {
  // within the debounced dom update we need to compute all the tags so that watchEffects still works
  function doDomUpdate() {
    domUpdatePromise = null
    return renderDOMHead(head, options)
  }
  // we want to delay for the hydration chunking
  const delayFn = options.delayFn || (fn => setTimeout(fn, 10))
  return domUpdatePromise = domUpdatePromise || new Promise(resolve => delayFn(() => resolve(doDomUpdate())))
}
