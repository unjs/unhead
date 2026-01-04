import type { RawInput } from './head'

export type * from './head'

export type Base = RawInput<'base'>
export type HtmlAttributes = RawInput<'htmlAttrs'>
export type Noscript = RawInput<'noscript'>
export type Style = RawInput<'style'>
export type BodyAttributes = RawInput<'bodyAttrs'>

// Note: Meta, Script, and Link are now discriminated unions exported from head.ts
// They include: Link, Script, Meta and all their narrowed variants
