export type RuleSeverity = 'warn' | 'info' | 'off'

export type ValidationRuleId
  = | 'canonical-og-url-mismatch'
    | 'charset-not-early'
    | 'defer-on-module-script'
    | 'deprecated-option-mode'
    | 'deprecated-prop-body'
    | 'deprecated-prop-children'
    | 'deprecated-prop-hid-vmid'
    | 'duplicate-resource-hint'
    | 'empty-meta-content'
    | 'empty-title'
    | 'html-in-title'
    | 'inline-script-size'
    | 'inline-style-size'
    | 'meta-beyond-1mb'
    | 'missing-alias-sorting-plugin'
    | 'missing-description'
    | 'missing-template-params-plugin'
    | 'missing-title'
    | 'non-absolute-canonical'
    | 'non-absolute-og-url'
    | 'numeric-tag-priority'
    | 'og-image-missing-dimensions'
    | 'og-missing-description'
    | 'og-missing-title'
    | 'possible-typo'
    | 'preconnect-missing-crossorigin'
    | 'prefetch-preload-conflict'
    | 'preload-async-defer-conflict'
    | 'preload-fetchpriority-conflict'
    | 'preload-font-crossorigin'
    | 'preload-missing-as'
    | 'preload-not-modulepreload'
    | 'redundant-dns-prefetch'
    | 'render-blocking-script'
    | 'robots-conflict'
    | 'script-src-with-content'
    | 'too-many-fetchpriority-high'
    | 'too-many-preconnects'
    | 'too-many-preloads'
    | 'twitter-handle-missing-at'
    | 'unresolved-template-param'
    | 'viewport-user-scalable'

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
