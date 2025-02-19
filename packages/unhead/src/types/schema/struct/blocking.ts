/**
 * Represents the possible blocking tokens for an element.
 */
export type BlockingToken = 'render'

/**
 * Represents the blocking attribute for an element.
 * The blocking attribute must have a value that is an unordered set of unique space-separated tokens,
 * each of which are possible blocking tokens.
 */
export interface Blocking {
  /**
   * The blocking attribute indicates that certain operations should be blocked on the fetching of an external resource.
   * The value is an unordered set of unique space-separated tokens, each of which are possible blocking tokens.
   *
   * @example
   * blocking: "render"
   */
  blocking?: BlockingToken | string // escape hatch
}
