import type { NodeVisit, Rule } from '../types'

function getKeyName(prop: any): string | null {
  if (!prop || (prop.type !== 'Property' && prop.type !== 'ObjectProperty'))
    return null
  if (prop.computed)
    return null
  return prop.key?.name ?? prop.key?.value ?? null
}

function findProp(object: any, name: string): any | null {
  for (const prop of object.properties || []) {
    if (getKeyName(prop) === name)
      return prop
  }
  return null
}

function renameProp(rule: Rule['id'], from: string, to: string): Rule {
  return {
    id: rule,
    kinds: ['ObjectExpression'],
    visit(v: NodeVisit) {
      if (!v.isHeadTagObject)
        return
      const prop = findProp(v.node, from)
      if (!prop)
        return
      const keyNode = prop.key
      const { s, report, resolveLocation } = v.ctx
      s.overwrite(keyNode.start, keyNode.end, to)
      const loc = resolveLocation(prop.start)
      report({
        line: loc.line,
        column: loc.column,
        ruleId: rule,
        message: `Renamed "${from}" to "${to}" (v2 deprecation removed in v3)`,
        fixed: true,
      })
    },
  }
}

export const propHid: Rule = renameProp('prop-hid', 'hid', 'key')
export const propVmid: Rule = renameProp('prop-vmid', 'vmid', 'key')
export const propChildren: Rule = renameProp('prop-children', 'children', 'innerHTML')
export const propRenderPriority: Rule = renameProp('prop-render-priority', 'renderPriority', 'tagPriority')

/** `body: true` → `tagPosition: 'bodyClose'`. `body: false` is dropped (default). */
export const propBodyTrue: Rule = {
  id: 'prop-body-true',
  kinds: ['ObjectExpression'],
  visit(v) {
    if (!v.isHeadTagObject)
      return
    const prop = findProp(v.node, 'body')
    if (!prop)
      return
    const { s, report, resolveLocation } = v.ctx
    const value = prop.value
    if (!value)
      return
    const loc = resolveLocation(prop.start)

    if (value.type === 'Literal' || value.type === 'BooleanLiteral') {
      const literal = (value as any).value
      if (literal === true) {
        s.overwrite(prop.start, prop.end, `tagPosition: 'bodyClose'`)
        report({
          line: loc.line,
          column: loc.column,
          ruleId: 'prop-body-true',
          message: `Replaced "body: true" with "tagPosition: 'bodyClose'"`,
          fixed: true,
        })
        return
      }
      if (literal === false) {
        removeProperty(v, prop)
        report({
          line: loc.line,
          column: loc.column,
          ruleId: 'prop-body-true',
          message: `Removed redundant "body: false"`,
          fixed: true,
        })
        return
      }
    }

    report({
      line: loc.line,
      column: loc.column,
      ruleId: 'prop-body-true',
      message: `Dynamic "body" option cannot be autofixed; rewrite to "tagPosition" ('bodyClose' when true, 'head' otherwise)`,
      fixed: false,
    })
  },
}

/** `{ name: 'x', content: undefined }` → `{ name: 'x', content: null }` (v3 typings disallow undefined). */
export const metaContentUndefined: Rule = {
  id: 'meta-content-undefined',
  kinds: ['ObjectExpression'],
  visit(v) {
    if (!v.isHeadTagObject || v.tagKind !== 'meta')
      return
    const prop = findProp(v.node, 'content')
    if (!prop)
      return
    const value = prop.value
    if (!value || value.type !== 'Identifier' || value.name !== 'undefined')
      return
    const { s, report, resolveLocation } = v.ctx
    s.overwrite(value.start, value.end, 'null')
    const loc = resolveLocation(prop.start)
    report({
      line: loc.line,
      column: loc.column,
      ruleId: 'meta-content-undefined',
      message: `Replaced "content: undefined" with "content: null"`,
      fixed: true,
    })
  },
}

function removeProperty(v: NodeVisit, prop: any): void {
  const { s, code } = v.ctx
  const parent = v.node
  const props = parent.properties || []
  const idx = props.indexOf(prop)
  let from = prop.start
  let to = prop.end

  const next = props[idx + 1]
  const prev = props[idx - 1]
  if (next) {
    // Consume trailing comma up to next property start.
    const between = code.slice(prop.end, next.start)
    const comma = between.indexOf(',')
    if (comma !== -1)
      to = prop.end + comma + 1
  }
  else if (prev) {
    // Back up over the preceding comma.
    const between = code.slice(prev.end, prop.start)
    const comma = between.lastIndexOf(',')
    if (comma !== -1)
      from = prev.end + comma
  }

  s.remove(from, to)
}

export const propRenameRules: Rule[] = [
  propHid,
  propVmid,
  propChildren,
  propBodyTrue,
  propRenderPriority,
  metaContentUndefined,
]
