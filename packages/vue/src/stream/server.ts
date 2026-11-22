import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { ActiveHeadEntry, CreateStreamableServerHeadOptions, HeadEntryOptions, KnownLinkRel, ResolvableHead, ResolvableTitleTemplate, SSRHeadPayload, Stringable, Unhead } from 'unhead/types'
import type { Plugin, Ref } from 'vue'
import type { ReactiveHead, ResolvableArray, ResolvableLink, ResolvableProperties, ResolvableValue } from '../types'
import type { CheckedHeadInput, HeadInput, TitleTag } from '../types/head-input'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream,
} from 'unhead/stream/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

type StreamableHeadObjectKey = 'base' | 'bodyAttrs' | 'htmlAttrs' | 'templateParams'
type VariableLink
  = | { rel: ResolvableValue<KnownLinkRel> }
    | { rel: ResolvableValue<string>, href: ResolvableValue<string> }
type TitleTemplateTag = Extract<ResolvableTitleTemplate, { textContent: unknown }>
type VueStreamableHeadSchema
  = Omit<ReactiveHead, StreamableHeadObjectKey | 'title' | 'titleTemplate' | 'link'>
    & ResolvableProperties<Pick<ReactiveHead, StreamableHeadObjectKey>>
    & {
      title?: ResolvableValue<Stringable | TitleTag>
      titleTemplate?: ResolvableTitleTemplate | Ref<Exclude<ResolvableTitleTemplate, TitleTemplateTag> | (TitleTemplateTag & { textContent: string })>
      link?: ResolvableArray<ResolvableLink | VariableLink>
    }
type VueStreamableHeadInput = ResolvableHead | HeadInput<VueStreamableHeadSchema, true>
type CheckedStreamableHeadInput<Input> = CheckedHeadInput<Input, VueStreamableHeadSchema, ReactiveHead['link']>

interface VueStreamableHeadEntry extends ActiveHeadEntry<VueStreamableHeadInput> {
  /** Update the entry with new input. */
  patch: <Input extends VueStreamableHeadInput>(input: CheckedStreamableHeadInput<Input>) => void
}

type VueStreamableHead = Omit<Unhead<any, SSRHeadPayload>, 'push'> & Plugin & {
  /** Create a head entry. */
  push: <Input extends VueStreamableHeadInput>(input: CheckedStreamableHeadInput<Input>, options?: HeadEntryOptions) => VueStreamableHeadEntry
}

/**
 * Vue-specific context returned by createStreamableHead.
 * Extends WebStreamableHeadContext with Vue-specific head type.
 */
export interface VueStreamableHeadContext extends Omit<WebStreamableHeadContext<VueStreamableHeadInput>, 'head'> {
  /**
   * The Vue head instance to use with app.use(head)
   */
  head: VueStreamableHead
}

/**
 * Creates a head instance configured for Vue streaming SSR.
 *
 * Vue emits resolved Suspense boundaries in document order.
 * `wrapStream()` can therefore write each head patch after its app chunk.
 * React and Solid use `<HeadStream />` for out-of-order reveals.
 *
 * @example
 * ```ts
 * export async function render(url: string, template: string) {
 *   const { app, router } = createApp()
 *   const { head, wrapStream } = createStreamableHead()
 *
 *   app.use(head)
 *   app.mixin(VueHeadMixin)
 *   router.push(url)
 *
 *   const vueStream = renderToWebStream(app)
 *   await router.isReady()
 *
 *   return wrapStream(vueStream, template)
 * }
 * ```
 */
export function createStreamableHead(
  options: Omit<CreateStreamableServerHeadOptions, 'propResolvers'> = {},
): VueStreamableHeadContext {
  const { head } = _createStreamableHead<VueStreamableHeadInput>({
    ...options,
    propResolvers: [VueResolver],
  })
  const vueHead = head as VueStreamableHead
  vueHead.install = vueInstall(vueHead)

  return {
    head: vueHead,
    // Use the core chunk renderer.
    wrapStream: (stream, template) => wrapStream(vueHead, stream, template),
  }
}

export type { VueHeadClient } from '../types'
// Export streaming-specific items only (not the re-exports from unhead/server)
export {
  createBootstrapScript,
  type CreateStreamableServerHeadOptions,
  type PreparedTemplate,
  prepareStreamingTemplate,
  prepareTemplate,
  renderShell,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  renderStreamBodyTags,
  renderStreamEnd,
  type StreamingTemplateParts,
  wrapStream,
} from 'unhead/stream/server'
