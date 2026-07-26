import type { ReferrerPolicy } from '../shared'

/**
 * A JSON speculation rule set.
 *
 * @see https://html.spec.whatwg.org/multipage/speculative-loading.html#speculation-rules
 */
export interface SpeculationRules {
  /** Identifies speculative requests through the `Sec-Speculation-Tags` header. */
  tag?: string | null
  prefetch?: readonly SpeculationRule[]
  prerender?: readonly SpeculationRule[]
}

export type SpeculationRuleEagerness
  = | 'immediate'
    | 'eager'
    | 'moderate'
    | 'conservative'
    | (string & Record<never, never>)

export type SpeculationRuleRequirement
  = 'anonymous-client-ip-when-cross-origin'

interface SpeculationRuleBase {
  /** A hint about when the browser should consider the speculative load. */
  eagerness?: SpeculationRuleEagerness
  /** The referrer policy for the speculative request. */
  referrer_policy?: ReferrerPolicy
  /** Identifies this rule through the `Sec-Speculation-Tags` header. */
  tag?: string | null
  /** Required browser capabilities for executing the rule. */
  requires?: readonly SpeculationRuleRequirement[]
  /** Expected `No-Vary-Search` response header value. */
  expects_no_vary_search?: string
  /** The browsing context in which a prerendered page is expected to open. */
  target_hint?: '_blank' | '_self' | '_parent' | '_top' | (string & Record<never, never>)
}

/** An explicit list of URLs to speculate. */
export type SpeculationRuleList = SpeculationRuleBase & {
  source?: 'list'
  urls: readonly string[]
  where?: never
  /** Selects the base URL used to resolve `urls`. */
  relative_to?: 'ruleset' | 'document'
}

/** A rule which selects links from the current document. */
export type SpeculationRuleDocument = SpeculationRuleBase & {
  urls?: never
  relative_to?: never
} & (
  | {
    source: 'document'
    where?: SpeculationRuleWhere
  }
  | {
    source?: never
    where: SpeculationRuleWhere
  }
)

export type SpeculationRule = SpeculationRuleList | SpeculationRuleDocument

/** The object form accepted by `href_matches`, equivalent to `URLPatternInit`. */
export interface SpeculationRuleUrlPattern {
  baseURL?: string
  protocol?: string
  username?: string
  password?: string
  hostname?: string
  port?: string
  pathname?: string
  search?: string
  hash?: string
}

type SpeculationRuleUrlPatternInput = string | SpeculationRuleUrlPattern

/**
 * A recursive document rule predicate. Exactly one predicate operator is valid
 * at each level; only `href_matches` also accepts `relative_to`.
 */
export type SpeculationRuleWhere
  = | {
    and: readonly SpeculationRuleWhere[]
    or?: never
    not?: never
    href_matches?: never
    selector_matches?: never
    relative_to?: never
  }
  | {
    and?: never
    or: readonly SpeculationRuleWhere[]
    not?: never
    href_matches?: never
    selector_matches?: never
    relative_to?: never
  }
  | {
    and?: never
    or?: never
    not: SpeculationRuleWhere
    href_matches?: never
    selector_matches?: never
    relative_to?: never
  }
  | {
    and?: never
    or?: never
    not?: never
    href_matches: SpeculationRuleUrlPatternInput | readonly SpeculationRuleUrlPatternInput[]
    selector_matches?: never
    relative_to?: 'ruleset' | 'document'
  }
  | {
    and?: never
    or?: never
    not?: never
    href_matches?: never
    selector_matches: string | readonly string[]
    relative_to?: never
  }
