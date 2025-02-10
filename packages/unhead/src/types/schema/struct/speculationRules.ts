import type { ReferrerPolicy } from '../shared'

export interface SpeculationRules {
  prefetch?: (SpeculationRuleList | SpeculationRuleDocument)[]
  prerender?: (SpeculationRuleList | SpeculationRuleDocument)[]
}

export interface SpeculationRuleBase {
  /**
   * A hint about how likely the user is to navigate to the URL
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#scores
   */
  score?: number
  /**
   * Parse urls/patterns relative to the document's base url.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#using-the-documents-base-url-for-external-speculation-rule-sets
   */
  relative_to?: 'document'
  /**
   * Assertions in the rule about the capabilities of the user agent while executing them.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#requirements
   */
  requires?: 'anonymous-client-ip-when-cross-origin'[]
  /**
   * Indicating where the page expects the prerendered content to be activated.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#window-name-targeting-hints
   */
  target_hint?: '_blank' | '_self' | '_parent' | '_top'
  /**
   * The policy to use for the speculative request.
   *
   * @see https://github.com/WICG/nav-speculation/blob/main/triggers.md#explicit-referrer-policy
   */
  referrer_policy?: ReferrerPolicy
}

export interface SpeculationRuleList extends SpeculationRuleBase {
  source: 'list'
  urls: string[]
}

export type SpeculationRuleFn = 'and' | 'or' | 'href_matches' | 'selector_matches' | 'not'
export type SpeculationRuleWhere = Partial<Record<SpeculationRuleFn, Partial<(Record<SpeculationRuleFn, (Partial<Record<SpeculationRuleFn, string>>) | string>)>[]>>

export interface SpeculationRuleDocument extends SpeculationRuleBase {
  source: 'document'
  where: SpeculationRuleWhere
}
