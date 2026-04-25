import type { Rule } from 'eslint'
import type * as ESTree from 'estree'

/**
 * Names of unhead composables/helpers whose first argument is a head input
 * object that we want to walk for static checks.
 */
export const HEAD_INPUT_CALLEES = new Set([
  'useHead',
  'useHeadSafe',
  'useServerHead',
  'useServerHeadSafe',
  'useSeoMeta',
  'useServerSeoMeta',
])

/**
 * Helpers that take a single tag-shaped object literal and return a typed tag.
 * These are the v3 narrowing helpers (`defineLink`, etc.).
 */
export const TAG_HELPER_CALLEES = new Set([
  'defineMeta',
  'defineLink',
  'defineScript',
  'defineNoscript',
  'defineStyle',
])

/**
 * Tag arrays inside a head input — these can each be an object literal we
 * walk for per-tag checks.
 */
export const HEAD_INPUT_TAG_KEYS = new Set([
  'meta',
  'link',
  'script',
  'noscript',
  'style',
])

export function getCalleeName(node: ESTree.CallExpression): string | undefined {
  const callee = node.callee
  if (callee.type === 'Identifier')
    return callee.name
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier')
    return callee.property.name
  return undefined
}

/**
 * Strip TypeScript wrapper expressions so checks against `'ObjectExpression'`,
 * `'Literal'`, etc. still work on `useHead(input as UseHeadInput)` and friends.
 * Recursive so nested wrappers like `(x as A) as B` collapse.
 */
export function unwrapTS(node: ESTree.Node | undefined): ESTree.Node | undefined {
  if (!node)
    return node
  // @typescript-eslint nodes are not in the upstream estree types, hence the cast.
  const t = (node as { type: string }).type
  if (t === 'TSAsExpression' || t === 'TSTypeAssertion' || t === 'TSNonNullExpression' || t === 'TSSatisfiesExpression' || t === 'TSInstantiationExpression')
    return unwrapTS((node as unknown as { expression: ESTree.Node }).expression)
  return node
}

export function getStringValue(node: ESTree.Node | undefined): string | undefined {
  const inner = unwrapTS(node)
  if (!inner)
    return undefined
  if (inner.type === 'Literal' && typeof inner.value === 'string')
    return inner.value
  if (inner.type === 'TemplateLiteral' && inner.expressions.length === 0 && inner.quasis.length === 1)
    return inner.quasis[0].value.cooked ?? undefined
  return undefined
}

export function getStringProp(obj: ESTree.ObjectExpression, key: string): string | undefined {
  const prop = findProperty(obj, key)
  return prop ? getStringValue(prop.value) : undefined
}

export function getBooleanProp(obj: ESTree.ObjectExpression, key: string): boolean | undefined {
  const prop = findProperty(obj, key)
  if (!prop)
    return undefined
  if (prop.value.type === 'Literal' && typeof prop.value.value === 'boolean')
    return prop.value.value
  return undefined
}

export function hasInnerContent(tag: ESTree.ObjectExpression): boolean {
  const html = findProperty(tag, 'innerHTML')
  const text = findProperty(tag, 'textContent')
  return Boolean(html || text)
}

/**
 * Returns the *last* matching property to mirror runtime JS semantics, where
 * a duplicate key in an object literal is overwritten by the later occurrence.
 * Without this, fixers like `no-deprecated-props` could disagree with what the
 * engine actually sees.
 */
export function findProperty(obj: ESTree.ObjectExpression, key: string): ESTree.Property | undefined {
  for (let i = obj.properties.length - 1; i >= 0; i--) {
    const prop = obj.properties[i]
    if (prop.type !== 'Property' || prop.computed)
      continue
    const k = prop.key
    if (k.type === 'Identifier' && k.name === key)
      return prop
    if (k.type === 'Literal' && k.value === key)
      return prop
  }
  return undefined
}

export interface TagVisitor {
  /** Called for every individual tag-shaped object literal: meta items, link items, etc. */
  onTag?: (tag: ESTree.ObjectExpression, tagType: string, ctx: Rule.RuleContext) => void
  /** Called for the top-level head input object literal passed to useHead/useSeoMeta/etc. */
  onHeadInput?: (input: ESTree.ObjectExpression, calleeName: string, ctx: Rule.RuleContext) => void
}

/**
 * Build an ESLint listener that walks unhead head-inputs and tag helpers.
 */
export function createTagVisitor(visitor: TagVisitor): (ctx: Rule.RuleContext) => Rule.RuleListener {
  return (ctx) => {
    function visitTagArray(arr: ESTree.ArrayExpression | undefined, tagType: string) {
      if (!arr || !visitor.onTag)
        return
      for (const el of arr.elements) {
        const inner = unwrapTS(el as ESTree.Node | undefined)
        if (inner && inner.type === 'ObjectExpression')
          visitor.onTag(inner, tagType, ctx)
      }
    }

    return {
      CallExpression(node) {
        const name = getCalleeName(node)
        if (!name)
          return

        if (TAG_HELPER_CALLEES.has(name)) {
          const arg = unwrapTS(node.arguments[0] as ESTree.Node | undefined)
          if (arg?.type === 'ObjectExpression') {
            const tagType = name.slice('define'.length).toLowerCase()
            visitor.onTag?.(arg, tagType, ctx)
          }
          return
        }

        if (!HEAD_INPUT_CALLEES.has(name))
          return

        const arg = unwrapTS(node.arguments[0] as ESTree.Node | undefined)
        if (arg?.type !== 'ObjectExpression')
          return

        visitor.onHeadInput?.(arg, name, ctx)

        // useSeoMeta is flat meta props, not a head input — don't descend into tag arrays.
        if (name === 'useSeoMeta' || name === 'useServerSeoMeta')
          return

        for (const prop of arg.properties) {
          if (prop.type !== 'Property' || prop.computed)
            continue
          const key = prop.key.type === 'Identifier'
            ? prop.key.name
            : prop.key.type === 'Literal' && typeof prop.key.value === 'string'
              ? prop.key.value
              : undefined
          if (!key || !HEAD_INPUT_TAG_KEYS.has(key))
            continue
          const value = unwrapTS(prop.value)
          if (value?.type === 'ArrayExpression')
            visitTagArray(value, key)
          else if (value?.type === 'ObjectExpression')
            visitor.onTag?.(value, key, ctx)
        }
      },
    }
  }
}
