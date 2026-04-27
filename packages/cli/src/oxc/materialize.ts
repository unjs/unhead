import type { HeadInputView, TagInput } from 'unhead/validate'

// oxc-parser AST is ESTree-shaped: Property/Literal/Identifier/ObjectExpression
// share the same node names as ESTree, so we work against a loose any-typed
// shape rather than pull oxc-parser's heavy type surface in.
type Node = any

const TS_WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'TSInstantiationExpression'])

export function unwrapTS(node: Node | undefined): Node | undefined {
  let cur = node
  while (cur && TS_WRAPPERS.has(cur.type))
    cur = cur.expression
  return cur
}

function getStringValue(node: Node | undefined): string | undefined {
  const inner = unwrapTS(node)
  if (!inner)
    return undefined
  if (inner.type === 'Literal' && typeof inner.value === 'string')
    return inner.value
  if (inner.type === 'TemplateLiteral' && inner.expressions.length === 0 && inner.quasis.length === 1)
    return inner.quasis[0].value.cooked ?? undefined
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

/**
 * Iterate object expression properties latest-to-first and return the *last*
 * matching property. Mirrors runtime JS semantics where a duplicate key is
 * overwritten by the later occurrence — so a fixer that writes the "current"
 * value writes the one the engine actually sees.
 */
export function findProperty(obj: Node, key: string): Node | undefined {
  for (let i = obj.properties.length - 1; i >= 0; i--) {
    const prop = obj.properties[i]
    if (getKeyName(prop) === key)
      return prop
  }
  return undefined
}

export interface OxcLoc {
  start: number
  end: number
}

export function materializeTag(
  obj: Node,
  tagType: TagInput['tagType'],
  inArray: boolean,
): TagInput {
  const props: TagInput['props'] = {}
  const keys = new Set<string>()
  const propLocs: Record<string, OxcLoc> = {}

  for (const p of obj.properties) {
    const name = getKeyName(p)
    if (!name)
      continue
    keys.add(name)
    propLocs[name] = { start: p.start, end: p.end }
    const value = unwrapTS(p.value)
    if (!value)
      continue
    if (value.type === 'Literal') {
      const v = value.value
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        props[name] = v
      continue
    }
    const str = getStringValue(value)
    if (str !== undefined)
      props[name] = str
  }

  return {
    tagType,
    props,
    keys,
    loc: { start: obj.start, end: obj.end },
    propLocs,
    inArray,
  }
}

export function materializeHeadInput(obj: Node, callee: string): HeadInputView {
  const props: Record<string, string> = {}
  const keys = new Set<string>()
  const propLocs: Record<string, OxcLoc> = {}

  for (const p of obj.properties) {
    const name = getKeyName(p)
    if (!name)
      continue
    keys.add(name)
    propLocs[name] = { start: p.start, end: p.end }
    if (name === 'title' || name === 'titleTemplate') {
      const str = getStringValue(p.value)
      if (str !== undefined)
        props[name] = str
    }
  }

  return { callee, props, keys, loc: { start: obj.start, end: obj.end }, propLocs }
}
