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
 */
export function collectImportedHelpers(program: Node): Set<string> {
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

export interface HeadCallVisitor {
  /** Called for each tag-shaped object literal in a head input or `defineX` helper call. */
  onTag?: (tag: Node, tagType: string, info: { inArray: boolean }) => void
  /** Called for the top-level `useHead` / `useSeoMeta` argument. */
  onHeadInput?: (input: Node, callee: string) => void
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
        const arg = unwrapTS(node.arguments[0])
        if (arg?.type === 'ObjectExpression') {
          const tagType = name.slice('define'.length).toLowerCase()
          visitor.onTag?.(arg, tagType, { inArray: false })
        }
        return
      }

      if (!HEAD_INPUT_CALLEES.has(name))
        return

      const arg = unwrapTS(node.arguments[0])
      if (arg?.type !== 'ObjectExpression')
        return

      visitor.onHeadInput?.(arg, name)

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
    },
  })
}
