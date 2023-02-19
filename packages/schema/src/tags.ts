import type { HeadTag as BaseHeadTag, MaybePromiseProps } from 'zhead'

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
   * Alias for children
   */
  innerHTML?: InnerContentVal
  /**
   * Sets the textContent of an element.
   */
  children?: InnerContentVal
  /**
   * Sets the textContent of an element. This will be HTML encoded.
   *
   * Alias for children
   */
  textContent?: InnerContentVal
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

export type TemplateVars = { titleSeparator: string } & Record<string, string>

export interface HasTemplateVars {
  templateVars?: TemplateVars
}

export type HeadTag = BaseHeadTag & TagUserProperties & TagInternalProperties & HasTemplateVars

export type HeadTagKeys = (keyof HeadTag)[]
