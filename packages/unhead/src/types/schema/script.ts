import type { Booleanable } from '../util'
import type { DataKeys } from './attributes/data'
import type { HttpEventAttributes } from './attributes/event'
import type { GlobalAttributes } from './attributes/global'
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
// Shared Constraints
// ============================================================================

/**
 * Props that are invalid on non-loadable script types (data scripts, inline scripts)
 */
interface NoLoadableScriptProps {
  src?: never
  async?: never
  defer?: never
  integrity?: never
  crossorigin?: never
  nomodule?: never
}

/**
 * Content for data scripts - either textContent or innerHTML, not both
 */
type DataScriptTextContent<T = string | Record<string, unknown>> = {
  /**
   * Sets the textContent of an element. Safer for XSS.
   * Can be a string or an object that will be serialized to JSON.
   */
  textContent?: T
  innerHTML?: never
} | {
  textContent?: never
  /**
   * Sets the innerHTML of an element.
   * Can be a string or an object that will be serialized to JSON.
   */
  innerHTML?: T
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
  /** Inline content is ignored when `src` is present. */
  textContent?: never
  /** Inline content is ignored when `src` is present. */
  innerHTML?: never
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
  /** Inline content is ignored when `src` is present. */
  textContent?: never
  /** Inline content is ignored when `src` is present. */
  innerHTML?: never
}

// ============================================================================
// Inline JavaScript Script
// ============================================================================

/**
 * Inline JavaScript (no events, no src).
 * Requires either `textContent` (recommended, XSS-safe) or `innerHTML`.
 */
export type InlineScript = ScriptBase & NoLoadableScriptProps & {
  /**
   * This attribute indicates the type of script represented.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type?: '' | 'text/javascript'
} & (
  | {
    /** Sets the textContent of an element. Safer for XSS. */
    textContent: string
    innerHTML?: never
  }
  | {
    textContent?: never
    /**
     * Sets the innerHTML of an element.
     *
     * Warning: not safe for XSS. Prefer `textContent` for inline scripts.
     */
    innerHTML: string | Record<string, unknown>
  }
)

// ============================================================================
// Inline Module Script
// ============================================================================

/**
 * Inline ES Module script (no src).
 * Requires either `textContent` (recommended, XSS-safe) or `innerHTML`.
 */
export type InlineModuleScript = ScriptBase & NoLoadableScriptProps & {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for module scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'module'
} & (
  | {
    /** Sets the textContent of an element. Safer for XSS. */
    textContent: string
    innerHTML?: never
  }
  | {
    textContent?: never
    /**
     * Sets the innerHTML of an element.
     *
     * Warning: not safe for XSS. Prefer `textContent` for inline scripts.
     */
    innerHTML: string
  }
)

// ============================================================================
// JSON-LD Structured Data Script
// ============================================================================

/**
 * JSON-LD structured data (uses textContent for XSS safety)
 * Note: For full schema.org typing, use @unhead/schema-org with useSchemaOrg()
 */
export type JsonLdScript = ScriptBase & NoLoadableScriptProps & DataScriptTextContent & {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for JSON-LD scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'application/ld+json'
}

// ============================================================================
// Speculation Rules Script
// ============================================================================

/**
 * Speculation Rules (uses textContent for safety)
 */
export type SpeculationRulesScript = ScriptBase & NoLoadableScriptProps & DataScriptTextContent<string | SpeculationRules> & {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for speculation rules scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'speculationrules'
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
export type ImportMapScript = ScriptBase & NoLoadableScriptProps & {
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
  innerHTML?: never
}

// ============================================================================
// Application JSON Script
// ============================================================================

/**
 * Application JSON script (generic JSON data)
 */
export type ApplicationJsonScript = ScriptBase & NoLoadableScriptProps & DataScriptTextContent & {
  /**
   * This attribute indicates the type of script represented.
   * Required discriminant for JSON scripts.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
   */
  type: 'application/json'
}

// ============================================================================
// Generic/Fallback Script
// ============================================================================

/**
 * Fallback for custom or unknown `type` values.
 *
 * Not included in the {@link Script} union to prevent silent absorption of known
 * `type` values (e.g. so `type: 'module'` without `src` or inline content stays
 * an error instead of collapsing into this permissive shape).
 *
 * For custom `type` values, prefer {@link defineScript}, which enforces strict
 * narrowing on known types while accepting `GenericScript` for anything else:
 *
 * ```ts
 * import { defineScript } from 'unhead'
 * useHead({ script: [defineScript({ type: 'text/plain', textContent: '...' })] })
 * ```
 */
export interface GenericScript extends ScriptBase, ScriptHttpEvents {
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
  innerHTML?: string | Record<string, unknown>
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
 *
 * Each `type` value maps to a specific interface that enforces per-type constraints.
 * For example, inline scripts require `textContent` and forbid `src`/`async`/`defer`.
 *
 * For custom or non-standard `type` values, use {@link defineScript}:
 * ```ts
 * import { defineScript } from 'unhead'
 * useHead({ script: [defineScript({ type: 'text/plain', textContent: '...' })] })
 * ```
 */
export type Script
  = | ExternalScript
    | ModuleScript
    | InlineScript
    | InlineModuleScript
    | JsonLdScript
    | SpeculationRulesScript
    | ImportMapScript
    | ApplicationJsonScript

// ============================================================================
// defineScript helper (type inference)
// ============================================================================

/**
 * Union of all `type` values that have narrowed script type definitions.
 */
export type KnownScriptType
  = | ''
    | 'text/javascript'
    | 'module'
    | 'application/ld+json'
    | 'speculationrules'
    | 'importmap'
    | 'application/json'

/**
 * Pick {@link Script} union members whose `type` accepts `U`.
 *
 * Handles members whose `type` is itself a union (e.g. {@link ExternalScript}'s
 * `'' | 'text/javascript'`), and members where `type` is optional.
 */
type MatchScriptByType<U>
  = Script extends infer M
    ? M extends { type?: infer MT }
      ? U extends MT
        ? M
        : never
      : never
    : never

/**
 * Resolve a single script input to either its strict {@link Script} variant (when
 * `type` is a {@link KnownScriptType}) or {@link GenericScript} (for custom types).
 *
 * When no `type` field is present, or `type` is non-string, the full {@link Script}
 * union is returned so discriminators like `src` vs `textContent` still apply.
 */
export type InferScript<T>
  = T extends { type: infer U }
    ? U extends string
      ? U extends KnownScriptType
        ? MatchScriptByType<U>
        : GenericScript & { type: U }
      : Script
    : Script
