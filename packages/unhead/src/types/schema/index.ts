import type { RawInput } from './head'

export type * from './head'

export type Base = RawInput<'base'>
export type HtmlAttributes = RawInput<'htmlAttrs'>
export type Noscript = RawInput<'noscript'>
export type Style = RawInput<'style'>
export type Meta = RawInput<'meta'>
export type Script = RawInput<'script'>
export type Link = RawInput<'link'>
export type BodyAttributes = RawInput<'bodyAttrs'>
