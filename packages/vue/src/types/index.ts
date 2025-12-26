import type { RawInput } from 'unhead/types'

export type * from './safeSchema'
export type * from './schema'
// Deprecated types - kept for backwards compatibility
/** @deprecated Use ReactiveHead instead */
export type { ReactiveHead as Head } from './schema'
export type * from './util'

export type { ActiveHeadEntry, HeadEntryOptions, HeadTag, RawInput, RenderSSRHeadOptions, ResolvableHead, SerializableHead, Unhead } from 'unhead/types'

export type { AriaAttributes, BodyAttributesWithoutEvents, BodyEvents, DataKeys, GlobalAttributes, HttpEventAttributes, LinkWithoutEvents, MetaFlat, ScriptWithoutEvents, SpeculationRules } from 'unhead/types'
/** @deprecated */
export type MergeHead = object
/** @deprecated Use MetaFlat instead */
export type { MetaFlat as MetaFlatInput } from 'unhead/types'

export type Base = RawInput<'base'>
export type HtmlAttributes = RawInput<'htmlAttrs'>
export type Noscript = RawInput<'noscript'>
export type Style = RawInput<'style'>
export type Meta = RawInput<'meta'>
export type Script = RawInput<'script'>
export type Link = RawInput<'link'>
export type BodyAttributes = RawInput<'bodyAttrs'>
