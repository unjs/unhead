import type { Booleanable } from '../util'
import type { HttpEventAttributes } from './attributes/event'
import type { GlobalAttributes } from './attributes/global'
import type { ReferrerPolicy } from './shared'
import type { Blocking } from './struct/blocking'

export interface ScriptBase extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking {
  /**
   * For classic scripts, if the async attribute is present,
   * then the classic script will be fetched in parallel to parsing and evaluated as soon as it is available.
   *
   * For module scripts,
   * if the async attribute is present then the scripts and all their dependencies will be executed in the defer queue,
   * therefore they will get fetched in parallel to parsing and evaluated as soon as they are available.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async
   */
  async?: Booleanable
  /**
   * Normal script elements pass minimal information to the window.onerror
   * for scripts which do not pass the standard CORS checks.
   * To allow error logging for sites which use a separate domain for static media, use this attribute.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-crossorigin
   */
  crossorigin?: '' |
    'anonymous' |
    'use-credentials'
  /**
   * This Boolean attribute is set to indicate to a browser that the script is meant to be executed after the document
   * has been parsed, but before firing DOMContentLoaded.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer
   */
  defer?: Booleanable
  /**
   * Provides a hint of the relative priority to use when fetching an external script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-fetchpriority
   */
  fetchpriority?: 'high' |
    'low' |
    'auto'
  /**
   * This attribute contains inline metadata that a user agent can use to verify
   * that a fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-integrity
   */
  integrity?: string
  /**
   * This Boolean attribute is set to indicate that the script should not be executed in browsers
   * that support ES modules — in effect,
   * this can be used to serve fallback scripts to older browsers that do not support modular JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-nomodule
   */
  nomodule?: Booleanable
  /**
   * Indicates which referrer to send when fetching the script, or resources fetched by the script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-referrerpolicy
   */
  referrerpolicy?: ReferrerPolicy
  /**
   * This attribute specifies the URI of an external script;
   * this can be used as an alternative to embedding a script directly within a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src
   */
  src?: string
  /**
   * This attribute indicates the type of script represented.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type?: '' |
    'text/javascript' |
    'module' |
    'application/json' |
    'application/ld+json' |
    'speculationrules' |
    (string & Record<never, never>)
  /**
   * A custom element name
   *
   * Used by the AMP specification.
   *
   * @see https://amp.dev/documentation/guides-and-tutorials/learn/spec/amphtml/#custom-elements
   */
  ['custom-element']?: 'amp-story' | 'amp-carousel' | 'amp-ad' | (string & Record<never, never>)
}

export type Script = ScriptBase & HttpEventAttributes
