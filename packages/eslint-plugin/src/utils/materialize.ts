import type * as ESTree from 'estree'
import type { HeadInputView, TagInput } from 'unhead/validate'
import { findProperty, getStringValue, unwrapTS } from './visitor'

/**
 * Build a parser-agnostic {@link TagInput} from an ESTree object literal so a
 * predicate can decide whether the tag is valid.
 *
 * `propLocs` carries the original ESTree {@link ESTree.Property} for each key,
 * so {@link applyDiagnostic} can resolve `at: { kind: 'prop-value', key }`
 * back to a node.
 */
export function materializeTag(
  node: ESTree.ObjectExpression,
  tagType: TagInput['tagType'],
  inArray: boolean,
): TagInput {
  const props: TagInput['props'] = {}
  const keys = new Set<string>()
  const propLocs: Record<string, ESTree.Property> = {}

  for (const p of node.properties) {
    if (p.type !== 'Property' || p.computed)
      continue
    const k = p.key
    const name = k.type === 'Identifier'
      ? k.name
      : k.type === 'Literal' && typeof k.value === 'string'
        ? k.value
        : undefined
    if (!name)
      continue
    keys.add(name)
    propLocs[name] = p

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

  return { tagType, props, keys, loc: node, propLocs, inArray }
}

/**
 * Build a parser-agnostic {@link HeadInputView} from the top-level `useHead`
 * argument. Only scalar top-level keys we currently validate (`title`,
 * `titleTemplate`) are materialized as `props`; tag arrays are walked
 * separately by {@link createTagVisitor}.
 */
export function materializeHeadInput(
  node: ESTree.ObjectExpression,
  callee: string,
): HeadInputView {
  const props: Record<string, string> = {}
  const keys = new Set<string>()
  const propLocs: Record<string, ESTree.Property> = {}

  for (const p of node.properties) {
    if (p.type !== 'Property' || p.computed)
      continue
    const k = p.key
    const name = k.type === 'Identifier'
      ? k.name
      : k.type === 'Literal' && typeof k.value === 'string'
        ? k.value
        : undefined
    if (!name)
      continue
    keys.add(name)
    propLocs[name] = p
    if (name === 'title' || name === 'titleTemplate') {
      const str = getStringValue(p.value)
      if (str !== undefined)
        props[name] = str
    }
  }

  return { callee, props, keys, loc: node, propLocs }
}

/**
 * Resolve the property record for a given key on a tag/input node. Used by
 * {@link applyDiagnostic} to look up locations from a {@link Diagnostic.at}
 * specifier.
 */
export function getPropNode(
  node: ESTree.ObjectExpression,
  key: string,
): ESTree.Property | undefined {
  return findProperty(node, key)
}
