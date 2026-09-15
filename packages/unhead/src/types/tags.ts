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
export type InternalTagKey = '_flatMeta' | '_static' | '_staticHtmlAttrs' | '_staticBodyAttrs'

export type TemplateParams = { separator?: '|' | '-' | '·' | string } & Record<string, null | string | boolean | number | Record<string, string | boolean | number>>

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
   * Copied from the entry options: the entry came from `useHeadSafe`.
   * @internal
   */
  _safe?: boolean
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
  /**
   * Pre-rendered HTML for this tag (static plan entries, see `pushStaticPlan`).
   * When set, the SSR renderer emits this string verbatim instead of
   * serialising `props` through `tagToString`.
   *
   * @internal
   */
  _html?: string
}

export type HeadTagKeys = (keyof HeadTag)[]

/**
 * A single row of a pre-rendered static plan: build-time output that the
 * normal server runtime splices into its render by weight, skipping
 * normalize/resolve for that tag. See `pushStaticPlan` in `unhead/server`.
 *
 * - `weight` sorts against normal tags exactly like `_w`/`tagWeight`.
 * - `identity` is the dedupe key (the same shape `dedupeKey()` would produce
 *   for the equivalent real tag, e.g. `meta:og:title`), so a plan row and a
 *   normal tag with the same identity dedupe against each other using
 *   standard weight/priority rules.
 * - `html` is emitted verbatim for positions 0-2. For positions 3-4
 *   (`htmlAttrs`/`bodyAttrs`) it must be a valid attribute string fragment
 *   (e.g. ` lang="en"`) that gets appended to the rendered attrs string.
 * - `position`: 0 head (default), 1 bodyOpen, 2 bodyClose, 3 htmlAttrs, 4 bodyAttrs.
 */
export type StaticPlanTag = readonly [
  weight: number,
  identity: string,
  html: string,
  position?: 0 | 1 | 2 | 3 | 4,
]
