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

export type InnerContentVal = string | Record<string, any>

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

export type TemplateParams = {
  separator?: '|' | '-' | '·' | string
  /**
   * A default title to use when no page title is provided.
   * When using a titleTemplate like `%s - My Site`, if no title is set the result would be ` - My Site`.
   * Setting defaultTitle will use this value as the title instead, e.g. `My Site`.
   */
  defaultTitle?: string
} & Record<string, null | string | Record<string, string>>

export interface ProcessesTemplateParams { processTemplateParams?: boolean }

export interface HasTemplateParams {
  templateParams?: TemplateParams
}

export interface HeadTag extends TagPriority, TagPosition, ResolvesDuplicates, HasTemplateParams {
  tag: TagKey
  props: Record<string, string>
  processTemplateParams?: boolean
  innerHTML?: string
  textContent?: string
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
}

export type HeadTagKeys = (keyof HeadTag)[]
