import type { HeadRenderer, RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { isPropsNormalizedHook } from '../utils/hooks'
import { resolveTags } from '../utils/resolve'
import { capoTagWeight } from './sort'
import { ssrRenderTags } from './util'
import { ssrRenderTagsTrusted } from './util/ssrRenderTags'

const EMPTY_OPTIONS: RenderSSRHeadOptions = {}
const UNSAFE_TAG_HOOK_RE = /^(?:entries:(?:resolve|normalize)|tags?:|ssr:render$)/

function hasHook(head: Unhead<any>, name: string): boolean {
  return Boolean((head.hooks as any)?._hooks?.[name]?.length)
}

function hasUnsafeTagHooks(head: Unhead<any>): boolean {
  const hooks = (head.hooks as any)?._hooks || {}
  for (const name in hooks) {
    if (UNSAFE_TAG_HOOK_RE.test(name)) {
      for (const hook of hooks[name] || []) {
        if (!isPropsNormalizedHook(hook))
          return true
      }
    }
  }
  return false
}

function renderServerHead(head: Unhead<any>, options: RenderSSRHeadOptions): SSRHeadPayload {
  if (hasHook(head, 'ssr:beforeRender')) {
    const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
    head.hooks!.callHook('ssr:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return ssrRenderTags([])
  }

  const trusted = !options.resolvedTags && !hasUnsafeTagHooks(head)
  let tags = options.resolvedTags || resolveTags(head, { tagWeight: options.tagWeight ?? capoTagWeight })
  let renderOptions = options
  if (hasHook(head, 'ssr:render')) {
    const ctx = { tags, options: { ...options } }
    head.hooks!.callHook('ssr:render', ctx)
    tags = ctx.tags
    renderOptions = ctx.options
  }

  const html = trusted ? ssrRenderTagsTrusted(tags, renderOptions) : ssrRenderTags(tags, renderOptions)
  if (!hasHook(head, 'ssr:rendered'))
    return html
  const renderCtx: SSRRenderContext = { tags, html }
  head.hooks!.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}

/* @__NO_SIDE_EFFECTS__ */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): HeadRenderer<SSRHeadPayload> {
  return (head: Unhead<any>) => renderServerHead(head, options)
}

/**
 * @deprecated Use `head.render()` instead.
 */
/* @__NO_SIDE_EFFECTS__ */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return renderServerHead(head, options || EMPTY_OPTIONS)
}
