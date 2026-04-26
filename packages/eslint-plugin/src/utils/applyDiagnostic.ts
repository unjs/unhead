import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import type { Diagnostic, PredicateFix } from 'unhead/validate'
import { findProperty } from './visitor'

/**
 * Translate a {@link Diagnostic.at} specifier into the ESTree node that
 * `ctx.report` should highlight.
 */
function locFor(
  obj: ESTree.ObjectExpression,
  at: Diagnostic['at'],
): ESTree.Node {
  if (!at || at.kind === 'tag')
    return obj
  const prop = findProperty(obj, at.key)
  if (!prop)
    return obj
  if (at.kind === 'prop')
    return prop
  if (at.kind === 'prop-key')
    return prop.key
  return prop.value
}

/**
 * Build an ESLint fixer function from a {@link PredicateFix}. Returns
 * `undefined` when the fix references a missing property (defensive — should
 * not happen for fixes a predicate emitted from the same node).
 */
function buildFixer(
  obj: ESTree.ObjectExpression,
  fix: PredicateFix,
  sourceCode: Rule.RuleContext['sourceCode'],
): ((fixer: Rule.RuleFixer) => Rule.Fix | null) | undefined {
  switch (fix.type) {
    case 'rename-prop': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return undefined
      return fixer => fixer.replaceText(prop.key, fix.newKey)
    }
    case 'replace-prop-value': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return undefined
      return fixer => fixer.replaceText(prop.value, fix.newSource)
    }
    case 'replace-prop': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return undefined
      return fixer => fixer.replaceText(prop, fix.newSource)
    }
    case 'insert-after-prop': {
      const prop = findProperty(obj, fix.afterKey)
      if (!prop)
        return undefined
      return fixer => fixer.insertTextAfter(prop, fix.insert)
    }
    case 'remove-prop': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return undefined
      return (fixer) => {
        const after = sourceCode.getTokenAfter(prop)
        if (after && after.value === ',')
          return fixer.removeRange([prop.range![0], after.range![1]])
        const before = sourceCode.getTokenBefore(prop)
        if (before && before.value === ',')
          return fixer.removeRange([before.range![0], prop.range![1]])
        return fixer.remove(prop)
      }
    }
    case 'wrap-tag': {
      return fixer => fixer.replaceText(obj, `${fix.wrapWith}(${sourceCode.getText(obj)})`)
    }
  }
}

/**
 * Translate a predicate {@link Diagnostic} into one or more `ctx.report` calls.
 * Emits a single report; suggestions on the diagnostic become ESLint
 * suggestions.
 */
export function reportDiagnostic(
  ctx: Rule.RuleContext,
  obj: ESTree.ObjectExpression,
  diag: Diagnostic,
): void {
  const node = locFor(obj, diag.at)
  const fixer = diag.fix ? buildFixer(obj, diag.fix, ctx.sourceCode) : undefined

  ctx.report({
    node,
    message: diag.message,
    fix: fixer,
    suggest: diag.suggestions?.map(s => ({
      desc: s.message,
      fix: buildFixer(obj, s.fix, ctx.sourceCode) ?? (() => null),
    })),
  })
}
