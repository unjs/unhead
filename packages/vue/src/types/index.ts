import type { RawInput } from 'unhead/types'

export type * from './safeSchema'
export type * from './schema'
export type * from './util'
export type { ActiveHeadEntry, Head, HeadEntryOptions, HeadTag, MergeHead, MetaFlatInput, RawInput, RenderSSRHeadOptions, ResolvableHead, SerializableHead, Unhead } from 'unhead/types'

export type { AriaAttributes, BodyAttributesWithoutEvents, BodyEvents, DataKeys, GlobalAttributes, HttpEventAttributes, LinkWithoutEvents, MetaFlat, ScriptWithoutEvents, SpeculationRules } from 'unhead/types'

export type Base = RawInput<'base'>
export type HtmlAttributes = RawInput<'htmlAttrs'>
export type Noscript = RawInput<'noscript'>
export type Style = RawInput<'style'>
export type Meta = RawInput<'meta'>
export type Script = RawInput<'script'>
export type Link = RawInput<'link'>
export type BodyAttributes = RawInput<'bodyAttrs'>
