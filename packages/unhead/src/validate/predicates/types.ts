import type { ValidationRuleId } from '../rules'

/**
 * Materialized view of a single head tag (`<meta>`, `<link>`, `<script>`, etc.)
 * suitable for parser-agnostic predicate checks. Adapters in the eslint-plugin
 * and the CLI walk their respective ASTs and produce one of these per tag.
 *
 * `props` only contains entries whose value is statically resolvable to a
 * primitive. `keys` contains every key that appeared in the source, including
 * those whose value couldn't be resolved (computed expressions, identifier
 * references, etc.). Predicates that need to know "did this key appear at all"
 * read `keys`; predicates that need the value read `props`.
 */
export interface TagInput {
  /** Tag list this came from in the head input (`meta` / `link` / `script` / `noscript` / `style`). */
  tagType: 'meta' | 'link' | 'script' | 'noscript' | 'style'
  /** Statically-resolvable props. */
  props: Record<string, string | number | boolean>
  /** Every prop name that appeared in source, resolvable or not. */
  keys: Set<string>
  /** Adapter-supplied opaque marker for the whole tag literal. */
  loc?: unknown
  /** Adapter-supplied opaque marker for individual prop values. */
  propLocs?: Record<string, unknown>
  /** Whether this tag literal lives inside an array element (vs standalone, e.g. inside `defineLink(...)`). */
  inArray?: boolean
}

/**
 * Top-level head input passed to `useHead` / `useSeoMeta`. Only the scalar
 * top-level keys we actually validate are surfaced; tag-array predicates run
 * against per-tag {@link TagInput}s instead.
 */
export interface HeadInputView {
  /** Name of the calling composable (`useHead`, `useSeoMeta`, …). */
  callee: string
  /** Statically-resolvable scalar props (currently `title`, `titleTemplate`). */
  props: Record<string, string>
  /** Every top-level key that appeared, resolvable or not. */
  keys: Set<string>
  loc?: unknown
  propLocs?: Record<string, unknown>
}

/**
 * A logical fix described in source-agnostic terms. Each adapter knows how to
 * translate this into either an ESLint `RuleFixer` call or a `magic-string`
 * edit.
 */
export type PredicateFix
  /** Rewrite just the key half of `key: value`. */
  = | { type: 'rename-prop', key: string, newKey: string }
  /** Replace the value half of `key: value` with literal source text. */
    | { type: 'replace-prop-value', key: string, newSource: string }
  /** Replace the entire `key: value` pair with literal source text. */
    | { type: 'replace-prop', key: string, newSource: string }
  /** Insert source text immediately after the named prop (caller supplies the leading `, `). */
    | { type: 'insert-after-prop', afterKey: string, insert: string }
  /** Remove a property and its surrounding comma. */
    | { type: 'remove-prop', key: string }
  /** Wrap the whole tag literal with a call expression: `wrapWith(<tag>)`. */
    | { type: 'wrap-tag', wrapWith: string }

export interface DiagnosticSuggestion {
  /** Already-formatted, human-readable suggestion label. */
  message: string
  fix: PredicateFix
}

export interface Diagnostic {
  ruleId: ValidationRuleId
  /** Already-formatted, human-readable diagnostic message. */
  message: string
  /**
   * Optional narrowed location:
   * - `{ kind: 'tag' }` (default) → `tag.loc`
   * - `{ kind: 'prop-key', key }` → key half of the named prop
   * - `{ kind: 'prop-value', key }` → value half of the named prop
   * - `{ kind: 'prop', key }` → whole `key: value` pair
   */
  at?:
    | { kind: 'tag' }
    | { kind: 'prop-key', key: string }
    | { kind: 'prop-value', key: string }
    | { kind: 'prop', key: string }
  /** Autofix to apply when the diagnostic is unambiguous. */
  fix?: PredicateFix
  /** Editor suggestions when an autofix would be too risky to apply blindly. */
  suggestions?: DiagnosticSuggestion[]
}

/**
 * Optional context passed by the adapter. Predicates that don't need any of
 * these should ignore the argument entirely.
 */
export interface PredicateContext {
  /**
   * Map of canonical helper names (`defineLink`, `defineScript`) to the local
   * binding they're imported under (`'defineLink'` for an unaliased import,
   * `'dl'` for `import { defineLink as dl }`). Predicates emit fixes using
   * the local binding so renamed imports stay valid.
   */
  importedHelpers?: Map<string, string>
}

export type TagPredicate = (tag: TagInput, ctx?: PredicateContext) => Diagnostic[]
export type HeadInputPredicate = (input: HeadInputView, ctx?: PredicateContext) => Diagnostic[]
