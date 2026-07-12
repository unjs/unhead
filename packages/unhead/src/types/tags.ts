import type { ResolvableHead } from './schema'
import type { ResolvableProperties } from './util'

export interface ResolvesDuplicates {
  /**
   * By default, tags which share the same unique key `name`, `property` are de-duped. To allow duplicates
   * to be made you can provide a unique key for each entry.
   */
  key?: string
  /**
   * The strategy to use when a duplicate tag is encountered.
   *
   * - `replace` - Replace the existing tag with the new tag
   * - `merge` - Merge the existing tag with the new tag
   *
   * @default 'replace' (some tags will default to 'merge', such as htmlAttr)
   */
  tagDuplicateStrategy?: 'replace' | 'merge'
}

export type ValidTagPositions = 'head' | 'bodyClose' | 'bodyOpen'

export interface TagPosition {
  /**
   * Specify where to render the tag.
   *
   * @default 'head'
   */
  tagPosition?: ValidTagPositions
}

export type InnerContentVal = string | object

export interface InnerContent {
  /**
   * Text content of the tag.
   *
   * Warning: This is not safe for XSS. Do not use this with user input, use `textContent` instead.
   */
  innerHTML?: InnerContentVal
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent?: InnerContentVal
}

/**
 * String-only inner content for elements that don't support object serialization (style, noscript).
 */
export interface StringInnerContent {
  /**
   * Text content of the tag.
   *
   * Warning: This is not safe for XSS. Do not use this with user input, use `textContent` instead.
   */
  innerHTML?: string
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent?: string
}

export interface TagPriority {
  /**
   * The priority for rendering the tag, without this all tags are rendered as they are registered
   * (besides some special tags).
   *
   * The following special tags have default priorities:
   * -2 `<meta charset ...>`
   * -1 `<base>`
   * 0 `<meta http-equiv="content-security-policy" ...>`
   *
   * All other tags have a default priority of 10: `<meta>`, `<script>`, `<link>`, `<style>`, etc
   */
  tagPriority?: number | 'critical' | 'high' | 'low' | `before:${string}` | `after:${string}`
}

export type TagUserProperties = ResolvableProperties<TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams>

export type TagKey = keyof ResolvableHead | InternalTagKey

/**
 * Internal tag types used by plugins
 * @internal
 */
export type InternalTagKey = '_flatMeta'

export type TemplateParams = { separator?: '|' | '-' | '·' | string } & Record<string, null | string | Record<string, string>>

export interface ProcessesTemplateParams { processTemplateParams?: boolean }

export interface HasTemplateParams {
  templateParams?: TemplateParams
}

/**
 * A scalar value carried by a normalized head tag attribute.
 *
 * Values are intentionally not declared as strings: normalization preserves
 * numbers and uses `false`/`null` as removal sentinels until the render phase.
 */
export type HeadTagAttributeValue = string | number | boolean | null

/**
 * An event listener carried by a normalized tag.
 *
 * `never[]` preserves concrete listener signatures without claiming that an
 * arbitrary listener is safe to invoke outside the renderer that owns it.
 */
export type HeadTagEventHandler = (...args: never[]) => unknown

/** A title-template callback retained until title resolution runs. */
export type HeadTagTitleTemplate = (title?: string) => string | null

/**
 * Properties carried by a tag after input resolution and normalization.
 *
 * Common HTML attributes stay directly addressable, while extension/plugin
 * properties remain `unknown` until narrowed. `class` and `style` use the
 * containers produced by normalization so hooks can safely mutate them.
 */
export interface HeadTagProps {
  [key: string]: unknown
  [key: `data-${string}`]: HeadTagAttributeValue | undefined
  [key: `on${string}`]: HeadTagAttributeValue | HeadTagEventHandler | undefined
  'as'?: HeadTagAttributeValue
  'async'?: HeadTagAttributeValue
  'charset'?: HeadTagAttributeValue
  'class'?: Set<string>
  'content'?: HeadTagAttributeValue | HeadTagAttributeValue[]
  'crossorigin'?: HeadTagAttributeValue
  'defer'?: HeadTagAttributeValue
  'fetchpriority'?: HeadTagAttributeValue
  'href'?: HeadTagAttributeValue
  'hreflang'?: HeadTagAttributeValue
  'id'?: HeadTagAttributeValue
  'media'?: HeadTagAttributeValue
  'name'?: HeadTagAttributeValue
  'nonce'?: HeadTagAttributeValue
  'property'?: HeadTagAttributeValue
  'rel'?: HeadTagAttributeValue
  'src'?: HeadTagAttributeValue
  'style'?: Map<string, string>
  'type'?: HeadTagAttributeValue
  'http-equiv'?: HeadTagAttributeValue
}

export interface HeadTag extends TagPriority, TagPosition, ResolvesDuplicates, HasTemplateParams {
  tag: TagKey
  props: HeadTagProps
  processTemplateParams?: boolean
  innerHTML?: string
  textContent?: string | number | boolean | HeadTagTitleTemplate
  /**
   * @internal
   */
  _w?: number
  /**
   * @internal
   */
  _p?: number
  /**
   * @internal
   */
  _d?: string
  /**
   * @internal
   */
  _h?: string
  /**
   * Source file:line that created this tag (devtools only).
   * @internal
   */
  _source?: string
}

export type HeadTagKeys = (keyof HeadTag)[]
