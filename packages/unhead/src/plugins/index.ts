export { AliasSortingPlugin } from './aliasSorting'
export { CanonicalPlugin } from './canonical'
export type { CanonicalPluginOptions } from './canonical'
export { defineHeadPlugin } from './defineHeadPlugin'
// Nuxt may bundle the v2 legacy plugin list while resolving this subpath from
// a hoisted v3 install. Keep the deprecated plugin available during migration.
export { DeprecationsPlugin } from './deprecations'
export { FlatMetaPlugin } from './flatMeta' // optional
export { InferSeoMetaPlugin } from './inferSeoMetaPlugin' // optional
export { MinifyPlugin } from './minify' // optional
export type { MinifyPluginOptions } from './minify'
export { PromisesPlugin } from './promises' // optional
export { SafeInputPlugin } from './safe' // optional
export { TemplateParamsPlugin } from './templateParams' // optional
export { ValidatePlugin } from './validate' // optional
export type { HeadValidationRule, RuleConfig, RulesConfig, RuleSeverity, ValidatePluginOptions, ValidationRuleId, ValidationRuleOptions } from './validate'
