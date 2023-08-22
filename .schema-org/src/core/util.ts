import { hash } from 'ohash'
import { defu } from 'defu'
import type { Id, SchemaOrgNode } from '../types'
import { resolveAsGraphKey } from '../utils'

function groupBy<T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) {
  return array.reduce((acc, value, index, array) => {
    const key = predicate(value, index, array)
    if (!acc[key])
      acc[key] = []
    acc[key].push(value)
    return acc
  }, {} as { [key: string]: T[] })
}

/**
 * Dedupe, flatten and a collection of nodes. Will also sort node keys and remove meta keys.
 * @param nodes
 */
export function dedupeNodes(nodes: SchemaOrgNode[]) {
  // assign based on id to dedupe across context
  const dedupedNodes: Record<Id, SchemaOrgNode> = {}
  for (const key of nodes.keys()) {
    const n = nodes[key]
    const nodeKey = resolveAsGraphKey(n['@id'] || hash(n)) as Id
    if (dedupedNodes[nodeKey])
      dedupedNodes[nodeKey] = defu(nodes[key], dedupedNodes[nodeKey]) as SchemaOrgNode
    else
      dedupedNodes[nodeKey] = nodes[key]
  }
  return Object.values(dedupedNodes)
}

export function normaliseNodes(nodes: SchemaOrgNode[]) {
  const sortedNodeKeys = nodes.keys()

  // assign based on id to dedupe across context
  const dedupedNodes: Record<Id, SchemaOrgNode> = {}
  for (const key of sortedNodeKeys) {
    const n = nodes[key]
    const nodeKey = resolveAsGraphKey(n['@id'] || hash(n)) as Id
    const groupedKeys = groupBy(Object.keys(n), (key) => {
      const val = n[key]
      if (key.startsWith('_'))
        return 'ignored'
      if (Array.isArray(val) || typeof val === 'object')
        return 'relations'
      return 'primitives'
    })

    const keys = [
      ...(groupedKeys.primitives || []).sort(),
      ...(groupedKeys.relations || []).sort(),
    ]
    let newNode = {} as SchemaOrgNode
    for (const key of keys)
      newNode[key] = n[key]
    if (dedupedNodes[nodeKey])
      newNode = defu(newNode, dedupedNodes[nodeKey]) as SchemaOrgNode
    dedupedNodes[nodeKey] = newNode
  }
  return Object.values(dedupedNodes)
}
