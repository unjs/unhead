export type RuleSeverity = 'warn' | 'info' | 'off'

/**
 * Canonical list of every validation rule ID. Mirrored by the `ValidationRuleId`
 * union below; both are kept in sync by hand. Consumers (devtools UI, eslint
 * plugin docs) can iterate this array to enumerate all rules at runtime.
 */
export const VALIDATION_RULE_IDS = /* @__PURE__ */ [
  'canonical-og-url-mismatch',
  'charset-not-early',
  'defer-on-module-script',
  'deprecated-option-mode',
  'deprecated-prop-body',
  'deprecated-prop-children',
  'deprecated-prop-hid-vmid',
  'duplicate-resource-hint',
  'empty-meta-content',
  'empty-title',
  'html-in-title',
  'inline-script-size',
  'inline-style-size',
  'meta-beyond-1mb',
  'missing-alias-sorting-plugin',
  'missing-description',
  'missing-template-params-plugin',
  'missing-title',
  'non-absolute-canonical',
  'non-absolute-og-url',
  'numeric-tag-priority',
  'og-image-missing-dimensions',
  'og-missing-description',
  'og-missing-title',
  'possible-typo',
  'preconnect-missing-crossorigin',
  'prefer-define-helpers',
  'prefetch-preload-conflict',
  'preload-async-defer-conflict',
  'preload-fetchpriority-conflict',
  'preload-font-crossorigin',
  'preload-missing-as',
  'preload-not-modulepreload',
  'redundant-dns-prefetch',
  'render-blocking-script',
  'robots-conflict',
  'script-src-with-content',
  'too-many-fetchpriority-high',
  'too-many-preconnects',
  'too-many-preloads',
  'twitter-handle-missing-at',
  'unresolved-template-param',
  'viewport-user-scalable',
] as const

export type ValidationRuleId = typeof VALIDATION_RULE_IDS[number]

export interface ValidationRuleOptions {
  'charset-not-early': { maxPosition: number }
  'inline-script-size': { maxKB: number }
  'inline-style-size': { maxKB: number }
  'meta-beyond-1mb': { maxBytes: number }
  'too-many-fetchpriority-high': { max: number }
  'too-many-preloads': { max: number }
  'too-many-preconnects': { max: number }
}

export type RuleConfig<Id extends ValidationRuleId> = Id extends keyof ValidationRuleOptions
  ? RuleSeverity | [severity: RuleSeverity, options: ValidationRuleOptions[Id]]
  : RuleSeverity

export type RulesConfig = { [K in ValidationRuleId]?: RuleConfig<K> }
