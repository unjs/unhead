import type { GlobalAttributes } from './attributes/global'

/**
 * Content for noscript elements - either textContent or innerHTML, not both
 */
type NoscriptContent = {
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent?: string
  innerHTML?: never
} | {
  textContent?: never
  /**
   * Text content of the tag.
   *
   * Warning: This is not safe for XSS. Do not use this with user input, use `textContent` instead.
   */
  innerHTML?: string
}

export type Noscript = Pick<GlobalAttributes, 'id' | 'class' | 'style'> & NoscriptContent
