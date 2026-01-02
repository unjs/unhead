import type { Booleanable } from '../util'
import type { HttpEventAttributes } from './attributes/event'
import type { GlobalAttributes } from './attributes/global'
import type { DataKeys } from './attributes/data'
import type { ReferrerPolicy } from './shared'
import type { Blocking } from './struct/blocking'
import type { SpeculationRules } from './struct/speculationRules'

// ============================================================================
// Script Type Narrowing
// ============================================================================
// This implements discriminated unions for script types based on the `type` attribute.
// Each script type only exposes properties relevant to that specific type.

/**
 * Events that fire on script elements (load/error)
 */
export type ScriptHttpEvents = Pick<HttpEventAttributes, 'onload' | 'onerror'>

/**
 * Base properties shared by all script types
 */
export interface ScriptBase extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking, DataKeys {
  /**
   * Provides a hint of the relative priority to use when fetching an external script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-fetchpriority
   */
  fetchpriority?: 'high' | 'low' | 'auto'
  /**
   * Indicates which referrer to send when fetching the script, or resources fetched by the script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-referrerpolicy
   */
  referrerpolicy?: ReferrerPolicy
}

// ============================================================================
// External JavaScript Script
// ============================================================================

/**
 * External JavaScript (fires events)
 */
export interface ExternalScript extends ScriptBase, ScriptHttpEvents {
  /**
   * This attribute specifies the URI of an external script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src
   */
  src: string
  /**
   * This attribute indicates the type of script represented.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type?: '' | 'text/javascript'
  /**
   * For classic scripts, if the async attribute is present,
   * then the classic script will be fetched in parallel to parsing and evaluated as soon as it is available.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async
   */
  async?: Booleanable
  /**
   * This Boolean attribute is set to indicate to a browser that the script is meant to be executed after the document
   * has been parsed, but before firing DOMContentLoaded.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer
   */
  defer?: Booleanable
  /**
   * Normal script elements pass minimal information to the window.onerror
   * for scripts which do not pass the standard CORS checks.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  /**
   * This attribute contains inline metadata that a user agent can use to verify
   * that a fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-integrity
   */
  integrity?: string
  /**
   * This Boolean attribute is set to indicate that the script should not be executed in browsers
   * that support ES modules.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-nomodule
   */
  nomodule?: Booleanable
}

// ============================================================================
// ES Module Script
// ============================================================================

/**
 * ES Module script (fires events)
 */
export interface ModuleScript extends ScriptBase, ScriptHttpEvents {
  /**
   * This attribute specifies the URI of an external script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src
   */
  src: string
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for module scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'module'
  /**
   * For module scripts, if the async attribute is present then the scripts and all their dependencies
   * will be executed in the defer queue.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async
   */
  async?: Booleanable
  /**
   * Normal script elements pass minimal information to the window.onerror
   * for scripts which do not pass the standard CORS checks.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  /**
   * This attribute contains inline metadata that a user agent can use to verify
   * that a fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-integrity
   */
  integrity?: string
}

// ============================================================================
// Inline JavaScript Script
// ============================================================================

/**
 * Inline JavaScript (no events, no src)
 */
export interface InlineScript extends ScriptBase {
  /**
   * This attribute indicates the type of script represented.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type?: '' | 'text/javascript'
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent: string
  // Explicitly no: src, async, defer, integrity, crossorigin
}

// ============================================================================
// Inline Module Script
// ============================================================================

/**
 * Inline ES Module script (no src)
 */
export interface InlineModuleScript extends ScriptBase {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for module scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'module'
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent: string
  // Explicitly no: src, async, defer, integrity, crossorigin
}

// ============================================================================
// JSON-LD Structured Data Script
// ============================================================================

/**
 * JSON-LD structured data (uses textContent for XSS safety)
 * Note: For full schema.org typing, use @unhead/schema-org with useSchemaOrg()
 */
export interface JsonLdScript extends ScriptBase {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for JSON-LD scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'application/ld+json'
  /**
   * Sets the textContent of an element. Safer for XSS.
   * Can be a string or an object that will be serialized to JSON.
   */
  textContent: string | Record<string, unknown>
  // Explicitly no: src, async, defer, integrity, crossorigin
}

// ============================================================================
// Speculation Rules Script
// ============================================================================

/**
 * Speculation Rules (uses textContent for safety)
 */
export interface SpeculationRulesScript extends ScriptBase {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for speculation rules scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'speculationrules'
  /**
   * Sets the textContent of an element.
   * Can be a string or a SpeculationRules object that will be serialized to JSON.
   */
  textContent: string | SpeculationRules
  // Explicitly no: src, async, defer, integrity, crossorigin
}

// ============================================================================
// Import Map Script
// ============================================================================

/**
 * Import map configuration
 */
export interface ImportMapConfig {
  imports: Record<string, string>
  scopes?: Record<string, Record<string, string>>
}

/**
 * Import map
 */
export interface ImportMapScript extends ScriptBase {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for import map scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'importmap'
  /**
   * Sets the textContent of an element.
   * Can be a string or an ImportMapConfig object that will be serialized to JSON.
   */
  textContent: string | ImportMapConfig
  // Explicitly no: src, async, defer, integrity, crossorigin
}

// ============================================================================
// Application JSON Script
// ============================================================================

/**
 * Application JSON script (generic JSON data)
 */
export interface ApplicationJsonScript extends ScriptBase {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for JSON scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'application/json'
  /**
   * Sets the textContent of an element. Safer for XSS.
   * Can be a string or an object that will be serialized to JSON.
   */
  textContent: string | Record<string, unknown>
  // Explicitly no: src, async, defer, integrity, crossorigin
}

// ============================================================================
// Generic/Fallback Script
// ============================================================================

/**
 * Generic/fallback (keeps full flexibility)
 * Note: Event handlers are added separately via MaybeEventFnHandlers in head.ts
 */
export interface GenericScript extends ScriptBase {
  /**
   * This attribute specifies the URI of an external script.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src
   */
  src?: string
  /**
   * This attribute indicates the type of script represented.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type?: string
  /**
   * For classic scripts, if the async attribute is present,
   * then the classic script will be fetched in parallel to parsing and evaluated as soon as it is available.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async
   */
  async?: Booleanable
  /**
   * This Boolean attribute is set to indicate to a browser that the script is meant to be executed after the document
   * has been parsed, but before firing DOMContentLoaded.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer
   */
  defer?: Booleanable
  /**
   * Normal script elements pass minimal information to the window.onerror
   * for scripts which do not pass the standard CORS checks.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  /**
   * This attribute contains inline metadata that a user agent can use to verify
   * that a fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-integrity
   */
  integrity?: string
  /**
   * This Boolean attribute is set to indicate that the script should not be executed in browsers
   * that support ES modules.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-nomodule
   */
  nomodule?: Booleanable
  /**
   * Text content of the tag.
   *
   * Warning: This is not safe for XSS. Do not use this with user input, use `textContent` instead.
   */
  innerHTML?: string
  /**
   * Sets the textContent of an element. Safer for XSS.
   */
  textContent?: string | Record<string, unknown>
  /**
   * A custom element name
   *
   * Used by the AMP specification.
   *
   * @see https://amp.dev/documentation/guides-and-tutorials/learn/spec/amphtml/#custom-elements
   */
  ['custom-element']?: 'amp-story' | 'amp-carousel' | 'amp-ad' | (string & Record<never, never>)
}

// ============================================================================
// Script Discriminated Union
// ============================================================================

/**
 * Discriminated union of all script types.
 * Order matters for TypeScript narrowing - specific types before generic.
 */
export type Script =
  | ExternalScript
  | ModuleScript
  | InlineScript
  | InlineModuleScript
  | JsonLdScript
  | SpeculationRulesScript
  | ImportMapScript
  | ApplicationJsonScript
  | GenericScript

// ============================================================================
// Legacy Exports (for backwards compatibility during migration)
// ============================================================================

/**
 * @deprecated Use the narrowed Script union type instead
 */
export type ScriptWithoutEvents = GenericScript
