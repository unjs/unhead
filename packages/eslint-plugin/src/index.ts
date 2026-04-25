import type { ESLint, Linter } from 'eslint'
import { migration, recommended } from './configs/recommended'
import { nonAbsoluteCanonical } from './rules/canonical-rules'
import { emptyMetaContent } from './rules/empty-meta-content'
import { noDeprecatedProps } from './rules/no-deprecated-props'
import { noUnknownMeta } from './rules/no-unknown-meta'
import { numericTagPriority } from './rules/numeric-tag-priority'
import { preferDefineHelpers } from './rules/prefer-define-helpers'
import { preloadFontCrossorigin, preloadMissingAs } from './rules/preload-rules'
import { robotsConflict } from './rules/robots-conflict'
import { deferOnModuleScript, scriptSrcWithContent } from './rules/script-rules'
import { noHtmlInTitle } from './rules/title-rules'
import { twitterHandleMissingAt } from './rules/twitter-handle-missing-at'
import { viewportUserScalable } from './rules/viewport-user-scalable'

const rules = {
  'defer-on-module-script': deferOnModuleScript,
  'empty-meta-content': emptyMetaContent,
  'no-deprecated-props': noDeprecatedProps,
  'no-html-in-title': noHtmlInTitle,
  'no-unknown-meta': noUnknownMeta,
  'non-absolute-canonical': nonAbsoluteCanonical,
  'numeric-tag-priority': numericTagPriority,
  'prefer-define-helpers': preferDefineHelpers,
  'preload-font-crossorigin': preloadFontCrossorigin,
  'preload-missing-as': preloadMissingAs,
  'robots-conflict': robotsConflict,
  'script-src-with-content': scriptSrcWithContent,
  'twitter-handle-missing-at': twitterHandleMissingAt,
  'viewport-user-scalable': viewportUserScalable,
} as const

const plugin: ESLint.Plugin = {
  meta: {
    name: '@unhead/eslint-plugin',
    version: '3.0.5',
  },
  rules,
}

function withPlugin(config: Linter.Config): Linter.Config {
  return { ...config, plugins: { '@unhead': plugin } }
}

export const configs: Record<'recommended' | 'migration', Linter.Config> = {
  recommended: withPlugin(recommended),
  migration: withPlugin(migration),
}

export { rules }
export default plugin
