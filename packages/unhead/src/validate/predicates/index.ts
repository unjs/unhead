import type { HeadInputPredicate, TagPredicate } from './types'
import { emptyMetaContent } from './empty-meta-content'
import { noDeprecatedProps } from './no-deprecated-props'
import { noHtmlInTitle } from './no-html-in-title'
import { noUnknownMeta } from './no-unknown-meta'
import { nonAbsoluteCanonical } from './non-absolute-canonical'
import { numericTagPriority } from './numeric-tag-priority'
import { preferDefineHelpers } from './prefer-define-helpers'
import { preloadFontCrossorigin, preloadMissingAs } from './preload-rules'
import { robotsConflict } from './robots-conflict'
import { deferOnModuleScript, scriptSrcWithContent } from './script-rules'
import { twitterHandleMissingAt } from './twitter-handle-missing-at'
import { viewportUserScalable } from './viewport-user-scalable'

export * from './runtime'
export * from './types'

export const tagPredicates = {
  'defer-on-module-script': deferOnModuleScript,
  'empty-meta-content': emptyMetaContent,
  'no-deprecated-props': noDeprecatedProps,
  'no-unknown-meta': noUnknownMeta,
  'non-absolute-canonical': nonAbsoluteCanonical,
  'numeric-tag-priority': numericTagPriority,
  'preload-font-crossorigin': preloadFontCrossorigin,
  'preload-missing-as': preloadMissingAs,
  'robots-conflict': robotsConflict,
  'script-src-with-content': scriptSrcWithContent,
  'twitter-handle-missing-at': twitterHandleMissingAt,
  'viewport-user-scalable': viewportUserScalable,
} satisfies Record<string, TagPredicate>

/** Migration-only tag predicates — opt-in via the `migration` config preset. */
export const migrationTagPredicates = {
  'prefer-define-helpers': preferDefineHelpers,
} satisfies Record<string, TagPredicate>

export const headInputPredicates = {
  'no-html-in-title': noHtmlInTitle,
} satisfies Record<string, HeadInputPredicate>

export {
  deferOnModuleScript,
  emptyMetaContent,
  noDeprecatedProps,
  noHtmlInTitle,
  nonAbsoluteCanonical,
  noUnknownMeta,
  numericTagPriority,
  preferDefineHelpers,
  preloadFontCrossorigin,
  preloadMissingAs,
  robotsConflict,
  scriptSrcWithContent,
  twitterHandleMissingAt,
  viewportUserScalable,
}
