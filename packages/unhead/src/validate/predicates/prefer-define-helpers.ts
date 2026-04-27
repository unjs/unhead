import type { Diagnostic, TagPredicate } from './types'

const TAG_TO_HELPER: Record<string, string> = {
  link: 'defineLink',
  script: 'defineScript',
}

/**
 * Suggests wrapping per-tag object literals with their `defineX` helper so
 * the v3 discriminated-union types narrow correctly.
 *
 * Adapter responsibilities:
 * - Only call this for tags that live inside an array (`tag.inArray === true`).
 * - Pass `ctx.importedHelpers` so the predicate knows when to surface a hard
 *   autofix (helper already imported) vs a suggestion (would need an import).
 */
export const preferDefineHelpers: TagPredicate = (tag, ctx) => {
  if (!tag.inArray)
    return []
  const helper = TAG_TO_HELPER[tag.tagType]
  if (!helper)
    return []
  // Use the file's local binding for the helper if present, so renamed imports
  // (`import { defineLink as dl }`) get a fix that wraps with `dl(...)` rather
  // than a reference to the canonical name (which the file hasn't imported).
  const localName = ctx?.importedHelpers?.get(helper)
  const imported = localName !== undefined
  const fix = { type: 'wrap-tag' as const, wrapWith: localName ?? helper }
  const diag: Diagnostic = {
    ruleId: 'prefer-define-helpers',
    message: `Wrap this ${tag.tagType} entry in \`${helper}()\` so unhead can narrow its type.`,
    fix: imported ? fix : undefined,
    suggestions: imported
      ? undefined
      : [{ message: `Wrap in \`${helper}()\` (you may need to import it).`, fix: { type: 'wrap-tag', wrapWith: helper } }],
  }
  return [diag]
}
