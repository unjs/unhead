import type { Head, MaybePromiseProps } from 'zhead'

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

export type ValidTagPositions = 'head' | 'bodyClose' | 'bodyOpen'

export interface TagPosition {
  /**
   * Specify where to render the tag.
   *
   * @default 'head'
   */
  tagPosition?: ValidTagPositions
  /**
   * Render the tag before the body close.
   *
   * @deprecated Use `tagPosition: 'bodyClose'` instead.
   */
  body?: true
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
  /**
   * Sets the textContent of an element.
   *
   * @deprecated Use `textContent` or `innerHTML`.
   */
  children?: InnerContentVal
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
  tagPriority?: number | 'critical' | 'high' | 'low' | `before:${string}` | `after:${string}`
}

export type TagUserProperties = TagPriority & TagPosition & MaybePromiseProps<InnerContent> & ResolvesDuplicates

export type TagKey = keyof Head

export interface HeadTag extends TagPriority, TagPosition, ResolvesDuplicates {
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
  /**
   * Hash code used to represent the tag.
   */
  _h?: string
  tag: TagKey
  props: Record<string, string>
  innerHTML?: string
  textContent?: string
}

export type HeadTagKeys = (keyof HeadTag)[]
