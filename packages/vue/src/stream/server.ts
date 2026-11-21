import type { WebStreamableHeadContext } from 'unhead/stream/server'
import type { ActiveHeadEntry, CreateStreamableServerHeadOptions, HeadEntryOptions, ResolvableTitleTemplate, SSRHeadPayload, Unhead } from 'unhead/types'
import type { Plugin, Ref } from 'vue'
import type { MaybeFalsy, ReactiveHead, ResolvableProperties } from '../types'
import {
  createStreamableHead as _createStreamableHead,
  wrapStream,
} from 'unhead/stream/server'
import { vueInstall } from '../install'
import { VueResolver } from '../resolver'

type StreamableHeadObjectKey = 'base' | 'bodyAttrs' | 'htmlAttrs' | 'templateParams' | 'title'
type VueStreamableHeadSchema
  = Omit<ReactiveHead, StreamableHeadObjectKey | 'titleTemplate'>
    & ResolvableProperties<Pick<ReactiveHead, StreamableHeadObjectKey>>
    & { titleTemplate?: ResolvableTitleTemplate | Ref<ResolvableTitleTemplate> }
type VueStreamableHeadValue = MaybeFalsy<VueStreamableHeadSchema>
type VueStreamableHeadInput
  = | VueStreamableHeadValue
    | Ref<VueStreamableHeadValue>
    | (() => VueStreamableHeadValue | Ref<VueStreamableHeadValue>)

type UnwrapHeadRef<Value> = Value extends Ref<infer Head> ? Head : Value
type ResolveHeadValue<Value> = UnwrapHeadRef<Value extends () => infer Result ? Result : Value>
type UnwrapTagArray<Value> = Value extends readonly (infer Tag)[] ? ResolveHeadValue<Tag> : Value
type TagValue<Value> = UnwrapTagArray<ResolveHeadValue<Value>>
type ObjectKeys<Value> = Value extends object ? keyof Value : never
type KnownObjectKeys<Value> = 0 extends (1 & Value) ? never : ObjectKeys<Value>

// Heterogeneous arrays can infer optional undefined keys for absent attributes.
type SuppliedTagKeys<Tag> = { [Key in keyof Tag]-?: Tag[Key] extends undefined ? never : Key }[keyof Tag]

// An exact match in any compatible variant takes precedence over extra keys in other variants.
type TagVariantResult<Tag, Variant> = Variant extends object
  ? Tag extends Variant
    ? Exclude<SuppliedTagKeys<Tag>, keyof Variant> extends infer ExtraKeys
      ? [ExtraKeys] extends [never] ? true : ExtraKeys
      : never
    : never
  : never
type UnknownVariantKeys<Tag, Variants> = [KnownObjectKeys<Tag>] extends [never]
  ? never
  : Tag extends object
    ? TagVariantResult<Tag, Variants> extends infer Match
      ? true extends Match ? never : Exclude<Match, true>
      : never
    : never
type UnknownTagAttributes<Tag, Variants>
  = Exclude<KnownObjectKeys<Tag>, ObjectKeys<Variants>> | UnknownVariantKeys<Tag, Variants>

type StreamableTagKey = Exclude<keyof VueStreamableHeadSchema, 'templateParams'>
// Check tag attributes without descending into attribute values such as JSON or class maps.
type UnknownTagKeys<Head> = Head extends object
  ? {
      [Key in keyof Head & StreamableTagKey]-?: UnknownTagAttributes<
        TagValue<Head[Key]>,
        Exclude<TagValue<VueStreamableHeadSchema[Key]>, Ref>
      >
    }[keyof Head & StreamableTagKey]
  : never
type UnknownHeadInputKeys<Input>
  = | Exclude<KnownObjectKeys<ResolveHeadValue<Input>>, keyof VueStreamableHeadSchema>
    | UnknownTagKeys<ResolveHeadValue<Input>>
type CheckedHeadInput<Input> = Input & (
  [UnknownHeadInputKeys<NoInfer<Input>>] extends [never]
    ? unknown
    : Record<UnknownHeadInputKeys<NoInfer<Input>>, never>
)

interface VueStreamableHeadEntry extends ActiveHeadEntry<VueStreamableHeadInput> {
  /** Update the entry with new input. */
  patch: <Input extends VueStreamableHeadInput>(input: CheckedHeadInput<Input>) => void
}

type VueStreamableHead = Omit<Unhead<VueStreamableHeadInput, SSRHeadPayload>, 'push'> & Plugin & {
  /** Create a head entry. */
  push: <Input extends VueStreamableHeadInput>(input: CheckedHeadInput<Input>, options?: HeadEntryOptions) => VueStreamableHeadEntry
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
