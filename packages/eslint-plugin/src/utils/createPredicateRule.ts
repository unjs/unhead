import type { Rule } from 'eslint'
import type * as ESTree from 'estree'
import type { HeadInputPredicate, PredicateContext, TagInput, TagPredicate } from 'unhead/validate'
import { reportDiagnostic } from './applyDiagnostic'
import { materializeHeadInput, materializeTag } from './materialize'
import { createTagVisitor, getCalleeName, HEAD_INPUT_CALLEES, unwrapTS } from './visitor'

const HELPER_NAMES = new Set(['defineLink', 'defineScript'])
const HELPER_SOURCES = new Set([
  'unhead',
  '@unhead/vue',
  '@unhead/react',
  '@unhead/svelte',
  '@unhead/solid-js',
  '@unhead/angular',
])

function isHelperSource(source: string): boolean {
  if (HELPER_SOURCES.has(source))
    return true
  // Be permissive within the @unhead namespace so framework subpaths (e.g.
  // `@unhead/vue/server`) still count.
  return source.startsWith('@unhead/')
}

function collectImportedHelpers(program: ESTree.Program): Set<string> {
  const out = new Set<string>()
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration')
      continue
    const source = typeof node.source?.value === 'string' ? node.source.value : ''
    if (!isHelperSource(source))
      continue
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier' && HELPER_NAMES.has(spec.imported.name))
        out.add(spec.imported.name)
      else if (spec.type === 'ImportDefaultSpecifier' && HELPER_NAMES.has(spec.local.name))
        out.add(spec.local.name)
    }
  }
  return out
}

/**
 * Build an ESLint rule create function from a parser-agnostic
 * {@link TagPredicate}. The predicate sees materialized {@link TagInput}
 * values and emits {@link Diagnostic}s; this helper translates each diagnostic
 * back to a `ctx.report` call.
 *
 * Set `needsHelpers` for predicates that consume `ctx.importedHelpers` (today
 * just `prefer-define-helpers`) — the helper-name scan only runs when
 * requested.
 */
export function createTagPredicateRule(
  predicate: TagPredicate,
  opts: { needsHelpers?: boolean } = {},
): (ctx: Rule.RuleContext) => Rule.RuleListener {
  return (ctx) => {
    let helpers: Set<string> | undefined
    function ensureHelpers(): Set<string> {
      if (!helpers)
        helpers = collectImportedHelpers(ctx.sourceCode.ast as ESTree.Program)
      return helpers
    }
    return createTagVisitor({
      onTag(tag, tagType, _ctx, info) {
        const input = materializeTag(tag, tagType as TagInput['tagType'], info.inArray)
        const pctx: PredicateContext | undefined = opts.needsHelpers
          ? { importedHelpers: ensureHelpers() }
          : undefined
        for (const diag of predicate(input, pctx))
          reportDiagnostic(ctx, tag, diag)
      },
    })(ctx)
  }
}

/**
 * Build an ESLint rule create function from a parser-agnostic
 * {@link HeadInputPredicate}. Targets the top-level `useHead` /
 * `useSeoMeta` argument (not nested tags).
 */
export function createHeadInputPredicateRule(
  predicate: HeadInputPredicate,
): (ctx: Rule.RuleContext) => Rule.RuleListener {
  return ctx => ({
    CallExpression(node) {
      const name = getCalleeName(node)
      if (!name || !HEAD_INPUT_CALLEES.has(name))
        return
      // Mirror createTagVisitor: peel TS wrappers so `useHead({...} as ...)`
      // and `useHead({...} satisfies ...)` are recognised.
      const arg = unwrapTS(node.arguments[0] as ESTree.Node | undefined)
      if (!arg || arg.type !== 'ObjectExpression')
        return
      const input = materializeHeadInput(arg, name)
      for (const diag of predicate(input))
        reportDiagnostic(ctx, arg as ESTree.ObjectExpression, diag)
    },
  })
}
