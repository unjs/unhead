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

export function getStringValue(node: ESTree.Node | undefined): string | undefined {
  if (!node)
    return undefined
  if (node.type === 'Literal' && typeof node.value === 'string')
    return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1)
    return node.quasis[0].value.cooked ?? undefined
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

export function findProperty(obj: ESTree.ObjectExpression, key: string): ESTree.Property | undefined {
  for (const prop of obj.properties) {
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
        if (el && el.type === 'ObjectExpression')
          visitor.onTag(el, tagType, ctx)
      }
    }

    return {
      CallExpression(node) {
        const name = getCalleeName(node)
        if (!name)
          return

        if (TAG_HELPER_CALLEES.has(name)) {
          const arg = node.arguments[0]
          if (arg?.type === 'ObjectExpression') {
            const tagType = name.slice('define'.length).toLowerCase()
            visitor.onTag?.(arg, tagType, ctx)
          }
          return
        }

        if (!HEAD_INPUT_CALLEES.has(name))
          return

        const arg = node.arguments[0]
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
          if (prop.value.type === 'ArrayExpression')
            visitTagArray(prop.value, key)
          else if (prop.value.type === 'ObjectExpression')
            visitor.onTag?.(prop.value, key, ctx)
        }
      },
    }
  }
}
