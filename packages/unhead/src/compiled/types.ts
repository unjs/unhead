export type CompiledTagValue = string | number | boolean | null

/**
 * Tag config and content, using the same keys as `HeadTag`.
 */
export interface CompiledTagExtra {
  textContent?: CompiledTagValue
  innerHTML?: CompiledTagValue
  tagPosition?: CompiledTagValue
  tagPriority?: CompiledTagValue
  key?: CompiledTagValue
  processTemplateParams?: CompiledTagValue
  tagDuplicateStrategy?: CompiledTagValue
}

/**
 * Normalized attributes. `class` and `style` stay strings in canonical order.
 * Only a `templateParams` tag may hold nested JSON.
 */
export type CompiledTagProps = Readonly<Record<string, CompiledTagValue | object>>

/**
 * One normalized head tag.
 *
 * @experimental The compiled tag format may change in a future minor release.
 */
export type CompiledTag = readonly [
  tag: string,
  props: CompiledTagProps | 0,
  // server compiled tags use the capo weight
  weight: number,
  // v3 `_d || hashTag(tag)`
  dedupe: string,
  extra?: Readonly<CompiledTagExtra> | 0,
  // see the FLAG_ constants in ./tags
  flags?: number,
]

/**
 * @experimental The compiled tag format may change in a future minor release.
 */
export type CompiledTags = readonly CompiledTag[]

/**
 * The compiled tags of a head entry, from `readCompiledEntry`.
 *
 * @experimental
 */
export interface CompiledEntryContent {
  tags: CompiledTags
  /** Values for the dynamic values. Undefined when the entry has none, or before a value function runs. */
  values: readonly unknown[] | undefined
  /** True when the entry came from a `useSeoMeta` call, so its title and description are page SEO meta. */
  seoMeta?: true
}
