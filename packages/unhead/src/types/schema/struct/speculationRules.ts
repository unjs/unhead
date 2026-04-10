import type { ReferrerPolicy } from '../shared'

export interface SpeculationRules {
  prefetch?: readonly SpeculationRule[]
  prerender?: readonly SpeculationRule[]
}

/**
 * A single speculation rule entry.
 *
 * List rules provide explicit `urls`; document rules provide a `where` selector.
 * Both shapes share the same interface so TypeScript doesn't require exact
 * literal `source` values, which avoids widening issues inside `useHead`.
 *
 * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md
 */
export interface SpeculationRule {
  /**
   * The rule source type.
   *
   * `'list'` for explicit URL lists, `'document'` for selector-based rules.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md
   */
  source?: 'list' | 'document' | (string & Record<never, never>)
  /**
   * Explicit URLs to speculate on (list rules).
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#list-rules
   */
  urls?: readonly string[]
  /**
   * Selector conditions for document rules.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#document-rules
   */
  where?: SpeculationRuleWhere
  /**
   * A hint about how likely the user is to navigate to the URL.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#scores
   */
  score?: number
  /**
   * Parse urls/patterns relative to the document's base url.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#using-the-documents-base-url-for-external-speculation-rule-sets
   */
  relative_to?: 'document' | (string & Record<never, never>)
  /**
   * Assertions about user agent capabilities required to execute the rule.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#requirements
   */
  requires?: readonly ('anonymous-client-ip-when-cross-origin' | (string & Record<never, never>))[]
  /**
   * Where the page expects the prerendered content to be activated.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#window-name-targeting-hints
   */
  target_hint?: '_blank' | '_self' | '_parent' | '_top' | (string & Record<never, never>)
  /**
   * The referrer policy for the speculative request.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#explicit-referrer-policy
   */
  referrer_policy?: ReferrerPolicy
}

export type SpeculationRuleFn = 'and' | 'or' | 'href_matches' | 'selector_matches' | 'not'
export type SpeculationRuleWhere = Partial<Record<SpeculationRuleFn, readonly Partial<(Record<SpeculationRuleFn, (Partial<Record<SpeculationRuleFn, string>>) | string>)>[]>>
