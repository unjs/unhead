import { walk } from 'oxc-walker'

// oxc-walker walks oxc-parser AST. We type loosely so the CLI doesn't carry
// the heavy oxc-parser type surface.
type Node = any

export const HEAD_INPUT_CALLEES = new Set([
  'useHead',
  'useHeadSafe',
  'useServerHead',
  'useServerHeadSafe',
  'useSeoMeta',
  'useServerSeoMeta',
])

/**
 * Nuxt-config wrappers whose first argument may carry an `app.head` block
 * that is functionally identical to a `useHead` input.
 */
export const NUXT_CONFIG_CALLEES = new Set([
  'defineNuxtConfig',
])

export const TAG_HELPER_CALLEES = new Set([
  'defineLink',
  'defineScript',
])

export const HEAD_INPUT_TAG_KEYS = new Set([
  'meta',
  'link',
  'script',
  'noscript',
  'style',
])

const TS_WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'TSInstantiationExpression'])

function unwrapTS(node: Node | undefined): Node | undefined {
  let cur = node
  while (cur && TS_WRAPPERS.has(cur.type))
    cur = cur.expression
  return cur
}

function getCalleeName(node: Node): string | undefined {
  // Peel TS wrappers so `(useHead as typeof useHead)({...})` and friends still
  // resolve to the underlying identifier.
  const callee = unwrapTS(node.callee)
  if (!callee)
    return undefined
  if (callee.type === 'Identifier')
    return callee.name
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier')
    return callee.property.name
  return undefined
}

function getKeyName(prop: Node): string | undefined {
  if (prop.type !== 'Property' || prop.computed)
    return undefined
  const k = prop.key
  if (k.type === 'Identifier')
    return k.name
  if (k.type === 'Literal' && typeof k.value === 'string')
    return k.value
  return undefined
}

const HELPER_NAMES = new Set(['defineLink', 'defineScript'])

/**
 * Module specifiers that re-export `defineLink` / `defineScript`. Imports of
 * those names from any other module belong to a different library and must
 * not be treated as the unhead helper — otherwise `prefer-define-helpers`
 * would emit an autofix that wraps a tag in a foreign function.
 */
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
  // Sub-paths of the framework packages also re-export helpers (e.g.
  // `@unhead/vue/server`). Be permissive within the @unhead namespace.
  return source.startsWith('@unhead/')
}

/**
 * Scan a Program for `defineLink` / `defineScript` import specifiers so the
 * `prefer-define-helpers` predicate can decide between an autofix (helper
 * already imported) and a suggestion (would need a new import). Only counts
 * imports from `unhead` or its framework subpaths — imports of the same name
 * from unrelated libraries are not the helper.
 *
 * Returns a `canonical → local-binding` map, so a renamed import like
 * `import { defineLink as dl } from 'unhead'` produces `defineLink → 'dl'`
 * and the predicate can emit a fix that calls `dl(...)`.
 */
export function collectImportedHelpers(program: Node): Map<string, string> {
  const out = new Map<string, string>()
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration')
      continue
    const source = typeof node.source?.value === 'string' ? node.source.value : ''
    if (!isHelperSource(source))
      continue
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier' && HELPER_NAMES.has(spec.imported.name))
        out.set(spec.imported.name, spec.local?.name ?? spec.imported.name)
    }
  }
  return out
}

export interface HeadCallVisitor {
  /** Called for each tag-shaped object literal in a head input or `defineX` helper call. */
  onTag?: (tag: Node, tagType: string, info: { inArray: boolean }) => void
  /** Called for the top-level `useHead` / `useSeoMeta` argument. */
  onHeadInput?: (input: Node, callee: string, call: Node) => void
  /**
   * Called once per recognised head/seo call (`useHead`, `useSeoMeta`,
   * `defineLink`, …), regardless of whether the argument is a recognisable
   * object literal. Used to surface coverage information.
   */
  onCall?: (call: Node, callee: string) => void
}

/**
 * Project-wide function call graph used by the `page-missing-head` check.
 * For each named function defined in the file, its body's set of called
 * identifier names; plus the set of all called identifier names anywhere
 * in the file. Together these let the auditor compute a transitive set of
 * "head-providing" composables across the project.
 */
export interface CallGraph {
  /** Function name → set of identifier names called inside its body. */
  functions: Map<string, Set<string>>
  /** Every identifier name called anywhere in the file. */
  allCalls: Set<string>
}

function collectCallees(root: Node): Set<string> {
  const calls = new Set<string>()
  walk(root as any, {
    enter(n: any) {
      if (n.type === 'CallExpression') {
        const name = getCalleeName(n)
        if (name)
          calls.add(name)
      }
    },
  })
  return calls
}

function visitDecl(decl: Node, fns: Map<string, Set<string>>): void {
  if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
    fns.set(decl.id.name, collectCallees(decl.body))
    return
  }
  if (decl.type === 'VariableDeclaration') {
    for (const d of decl.declarations) {
      if (d.id?.type !== 'Identifier' || !d.init)
        continue
      const init = unwrapTS(d.init)
      if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression'))
        fns.set(d.id.name, collectCallees(init.body))
    }
  }
}

export function extractCallGraph(program: Node): CallGraph {
  const functions = new Map<string, Set<string>>()
  for (const stmt of program.body) {
    if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      visitDecl(stmt.declaration, functions)
    }
    else if (stmt.type === 'ExportDefaultDeclaration') {
      const d = stmt.declaration
      if (d?.type === 'FunctionDeclaration' && d.id?.name)
        functions.set(d.id.name, collectCallees(d.body))
    }
    else {
      visitDecl(stmt, functions)
    }
  }
  return { functions, allCalls: collectCallees(program) }
}

export interface CandidateTitle {
  /** Identifier name of the called function (resolved through TS wrappers). */
  callee: string
  /** Resolvable string value of the `title` property. */
  value: string
  /**
   * Whether the value contained a `${}` template substitution that we coerced
   * to a placeholder. The title-consistency analyser ignores these for
   * separator/suffix detection.
   */
  dynamic: boolean
  /** Start offset of the `title:` property within the program. */
  start: number
}

const TITLE_PROP_KEY = 'title'
const TITLE_TEMPLATE_PROP_KEY = 'titleTemplate'

function readStringLiteral(value: Node): { value: string, dynamic: boolean } | undefined {
  const v = unwrapTS(value)
  if (!v)
    return undefined
  if (v.type === 'Literal' && typeof v.value === 'string')
    return { value: v.value, dynamic: false }
  if (v.type === 'TemplateLiteral') {
    // Concatenate quasi cooked text with a literal "{…}" placeholder for each
    // interpolation so the separator / suffix analysis still has something
    // to work with. Avoids the actual `${…}` form to keep the escape rules
    // simple (and to satisfy no-template-curly-in-string).
    let out = ''
    for (let i = 0; i < v.quasis.length; i++) {
      out += v.quasis[i].value.cooked ?? v.quasis[i].value.raw ?? ''
      if (i < v.expressions.length)
        out += '{…}'
    }
    return { value: out, dynamic: v.expressions.length > 0 }
  }
  return undefined
}

/**
 * Walk the whole program and capture every CallExpression whose first arg is
 * an ObjectExpression carrying a literal `title:` (or `titleTemplate:`)
 * string. Used by the title-consistency analyser to follow project-specific
 * head-providing wrappers like `useToolSeo({ title: '…' })` once the fixpoint
 * has identified them.
 */
export function extractCandidateTitles(program: Node): { titles: CandidateTitle[], templates: CandidateTitle[] } {
  const titles: CandidateTitle[] = []
  const templates: CandidateTitle[] = []
  walk(program as any, {
    enter(node: any) {
      if (node.type !== 'CallExpression')
        return
      const callee = getCalleeName(node)
      if (!callee)
        return
      const arg = unwrapTS(node.arguments[0])
      if (arg?.type !== 'ObjectExpression')
        return
      for (const prop of arg.properties) {
        const key = getKeyName(prop)
        if (key !== TITLE_PROP_KEY && key !== TITLE_TEMPLATE_PROP_KEY)
          continue
        const lit = readStringLiteral(prop.value)
        if (!lit)
          continue
        const entry: CandidateTitle = { callee, value: lit.value, dynamic: lit.dynamic, start: prop.start }
        if (key === TITLE_PROP_KEY)
          titles.push(entry)
        else
          templates.push(entry)
      }
    },
  })
  return { titles, templates }
}

/**
 * Walk an oxc Program and dispatch each head call (`useHead`, `useSeoMeta`,
 * `defineLink`, `defineScript`, …) to the visitor. Mirrors the eslint-plugin
 * `createTagVisitor` shape so predicates run identically across both adapters.
 */
export function walkHeadCalls(program: Node, visitor: HeadCallVisitor): void {
  walk(program as any, {
    enter(node: any) {
      if (node.type !== 'CallExpression')
        return

      const name = getCalleeName(node)
      if (!name)
        return

      if (TAG_HELPER_CALLEES.has(name)) {
        visitor.onCall?.(node, name)
        const arg = unwrapTS(node.arguments[0])
        if (arg?.type === 'ObjectExpression') {
          const tagType = name.slice('define'.length).toLowerCase()
          visitor.onTag?.(arg, tagType, { inArray: false })
        }
        return
      }

      if (NUXT_CONFIG_CALLEES.has(name)) {
        const arg = unwrapTS(node.arguments[0])
        if (arg?.type !== 'ObjectExpression')
          return
        const head = findNuxtAppHead(arg)
        if (!head)
          return
        visitor.onCall?.(node, name)
        visitor.onHeadInput?.(head, name, node)
        descendHeadInput(head, name, visitor)
        return
      }

      if (!HEAD_INPUT_CALLEES.has(name))
        return

      visitor.onCall?.(node, name)

      const arg = unwrapTS(node.arguments[0])
      if (arg?.type !== 'ObjectExpression')
        return

      visitor.onHeadInput?.(arg, name, node)
      descendHeadInput(arg, name, visitor)
    },
  })
}

function descendHeadInput(arg: Node, name: string, visitor: HeadCallVisitor): void {
  // `useSeoMeta` is flat meta props, not a head input — don't descend into tag arrays.
  if (name === 'useSeoMeta' || name === 'useServerSeoMeta')
    return

  for (const prop of arg.properties) {
    const key = getKeyName(prop)
    if (!key || !HEAD_INPUT_TAG_KEYS.has(key))
      continue
    const value = unwrapTS(prop.value)
    if (value?.type === 'ArrayExpression') {
      for (const el of value.elements) {
        const inner = unwrapTS(el)
        if (inner?.type === 'ObjectExpression')
          visitor.onTag?.(inner, key, { inArray: true })
      }
    }
    else if (value?.type === 'ObjectExpression') {
      visitor.onTag?.(value, key, { inArray: false })
    }
  }
}

/**
 * Find the `app.head` ObjectExpression inside a `defineNuxtConfig({...})`
 * argument, if present. Other shapes (spread, references, function calls)
 * are skipped — we only audit head config that's authored as an object literal.
 */
function findNuxtAppHead(config: Node): Node | undefined {
  for (const prop of config.properties) {
    if (getKeyName(prop) !== 'app')
      continue
    const app = unwrapTS(prop.value)
    if (app?.type !== 'ObjectExpression')
      return undefined
    for (const inner of app.properties) {
      if (getKeyName(inner) !== 'head')
        continue
      const head = unwrapTS(inner.value)
      if (head?.type === 'ObjectExpression')
        return head
      return undefined
    }
  }
  return undefined
}
