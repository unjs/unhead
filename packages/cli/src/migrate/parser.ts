import type { NodeVisit, Rule, RuleContext, TagKind } from './types'
import { parseSync } from 'oxc-parser'
import { walk } from 'oxc-walker'

const UNHEAD_SOURCE_RE = /^(?:@unhead\/[^/]+|unhead)(?:\/[^?]*)?$/

const HEAD_ENTRY_NAMES = new Set([
  'useHead',
  'useHeadSafe',
  'useSeoMeta',
  'useServerHead',
  'useServerHeadSafe',
  'useServerSeoMeta',
  'createHead',
  'createServerHead',
  'createHeadCore',
  'createUnhead',
])

const ARRAY_TAG_KEYS = new Set(['link', 'meta', 'script', 'style', 'noscript'])
const SINGLE_OBJECT_TAG_KEYS = new Set(['htmlAttrs', 'bodyAttrs', 'base'])

export interface ParseRunOptions {
  rules: Rule[]
  ctx: RuleContext
}

export function parseAndDispatch({ rules, ctx }: ParseRunOptions): void {
  const { code, file } = ctx

  // Map<kind, Rule[]>
  const byKind = new Map<string, Rule[]>()
  for (const rule of rules) {
    for (const k of rule.kinds) {
      const bucket = byKind.get(k) || []
      bucket.push(rule)
      byKind.set(k, bucket)
    }
  }

  let ast: ReturnType<typeof parseSync>
  try {
    ast = parseSync(file, code)
  }
  catch {
    return
  }
  if (ast.errors?.length) {
    // Still try to walk; oxc returns a best-effort AST.
  }

  const unheadLocalToImported = new Map<string, string>()
  const namespaceNames = new Set<string>()

  walk(ast.program, {
    enter(node: any, parent: any) {
      if (node.type === 'ImportDeclaration') {
        const source = node.source?.value
        if (typeof source === 'string' && UNHEAD_SOURCE_RE.test(source)) {
          for (const spec of node.specifiers || []) {
            if (spec.type === 'ImportSpecifier' && spec.imported?.name)
              unheadLocalToImported.set(spec.local.name, spec.imported.name)
            else if (spec.type === 'ImportNamespaceSpecifier')
              namespaceNames.add(spec.local.name)
          }
        }
        dispatch('ImportDeclaration', node, parent)
        return
      }

      if (node.type === 'AwaitExpression') {
        dispatch('AwaitExpression', node, parent)
        return
      }

      if (node.type === 'CallExpression') {
        dispatch('CallExpression', node, parent)
        const headCallName = resolveHeadCallName(node, unheadLocalToImported, namespaceNames)
        if (headCallName) {
          walkHeadCallArg(node, headCallName, dispatch)
        }
      }
    },
  })

  function dispatch(kind: string, node: any, parent: any, extras?: Partial<NodeVisit>): void {
    const bucket = byKind.get(kind)
    if (!bucket)
      return
    const visit: NodeVisit = { node, parent, ctx, ...extras }
    for (const rule of bucket) rule.visit(visit)
  }
}

function resolveHeadCallName(node: any, locals: Map<string, string>, namespaces: Set<string>): string | null {
  const callee = node.callee
  if (!callee)
    return null
  if (callee.type === 'Identifier') {
    const imported = locals.get(callee.name)
    if (imported && HEAD_ENTRY_NAMES.has(imported))
      return imported
    if (!imported && HEAD_ENTRY_NAMES.has(callee.name))
      return callee.name
    return null
  }
  if (
    callee.type === 'MemberExpression'
    && callee.object?.type === 'Identifier'
    && namespaces.has(callee.object.name)
    && callee.property?.type === 'Identifier'
    && HEAD_ENTRY_NAMES.has(callee.property.name)
  ) {
    return callee.property.name
  }
  return null
}

function walkHeadCallArg(
  callNode: any,
  headCallName: string,
  dispatch: (kind: string, node: any, parent: any, extras?: Partial<NodeVisit>) => void,
): void {
  const arg = callNode.arguments?.[0]
  if (!arg)
    return

  if (headCallName === 'useSeoMeta' || headCallName === 'useServerSeoMeta' || headCallName === 'useHeadSafe' || headCallName === 'useServerHeadSafe') {
    if (arg.type === 'ObjectExpression') {
      dispatch('ObjectExpression', arg, callNode, { isHeadTagObject: true, tagKind: 'meta' })
      for (const prop of arg.properties || []) {
        walkArrayTagProps(prop, dispatch, callNode)
      }
    }
    return
  }

  if (arg.type !== 'ObjectExpression')
    return

  for (const prop of arg.properties || []) {
    walkArrayTagProps(prop, dispatch, callNode)
  }
}

function walkArrayTagProps(
  prop: any,
  dispatch: (kind: string, node: any, parent: any, extras?: Partial<NodeVisit>) => void,
  parent: any,
): void {
  if (prop.type !== 'Property' && prop.type !== 'ObjectProperty')
    return
  const keyName = prop.key?.name || prop.key?.value
  if (!keyName)
    return

  if (ARRAY_TAG_KEYS.has(keyName)) {
    const value = prop.value
    if (value?.type === 'ArrayExpression') {
      for (const el of value.elements || []) {
        if (el && el.type === 'ObjectExpression') {
          dispatch('ObjectExpression', el, parent, {
            isHeadTagObject: true,
            tagKind: keyName as TagKind,
          })
        }
      }
    }
    else if (value?.type === 'ObjectExpression') {
      dispatch('ObjectExpression', value, parent, {
        isHeadTagObject: true,
        tagKind: keyName as TagKind,
      })
    }
    return
  }

  if (SINGLE_OBJECT_TAG_KEYS.has(keyName)) {
    const value = prop.value
    if (value?.type === 'ObjectExpression') {
      dispatch('ObjectExpression', value, parent, {
        isHeadTagObject: true,
        tagKind: keyName as TagKind,
      })
    }
  }
}
