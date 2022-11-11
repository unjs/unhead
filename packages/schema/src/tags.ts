import type { HeadTag as BaseHeadTag } from '@zhead/schema'

export interface ResolvesDuplicates {
  /**
   * By default, tags which share the same unique key `name`, `property` are de-duped. To allow duplicates
   * to be made you can provide a unique key for each entry.
   */
  key?: string
  /**
   * @deprecated Use `key` instead
   */
  hid?: string
  /**
   * @deprecated Use `key` instead
   */
  vmid?: string
  /**
   * Specify where to render the tag.
   *
   * @default 'head'
   */
  tagDuplicateStrategy?: 'replace' | 'merge'
}

export interface TagPosition {
  /**
   * Specify where to render the tag.
   *
   * @default 'head'
   */
  tagPosition?: 'head' | 'bodyClose' | 'bodyOpen'
  /**
   * Render the tag before the body close.
   *
   * @deprecated Use `tagPosition: 'bodyClose'` instead.
   */
  body?: true
}

export interface InnerContent {
  /**
   * Text content of the tag.
   *
   * Alias for children
   */
  innerHTML?: string
  /**
   * Sets the textContent of an element.
   */
  children?: string
  /**
   * Sets the textContent of an element. This will be HTML encoded.
   *
   * Alias for children
   */
  textContent?: string
}

export interface TagPriority {
  /**
   * The priority for rendering the tag, without this all tags are rendered as they are registered
   * (besides some special tags).
   *
   * The following special tags have default priorities:
   * * -2 <meta charset ...>
   * * -1 <base>
   * * 0 <meta http-equiv="content-security-policy" ...>
   *
   * All other tags have a default priority of 10: <meta>, <script>, <link>, <style>, etc
   */
  tagPriority?: number | `before:${string}` | `after:${string}`
}

export type TagUserProperties = TagPriority & TagPosition & InnerContent & ResolvesDuplicates

export interface TagInternalProperties {
  /**
   * Entry ID
   */
  _e?: number
  /**
   * Position
   */
  _p?: number
  /**
   * Dedupe key
   */
  _d?: string
}

export type HeadTag = BaseHeadTag & TagUserProperties & TagInternalProperties

export type HeadTagKeys = (keyof HeadTag)[]
