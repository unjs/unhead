import type { Arrayable, Id, MetaInput, ResolvedMeta, SchemaOrgNode, Thing } from '../types'
import { createDefu } from 'defu'
import { hash } from 'ohash'
import { imageResolver } from '../nodes'
import { asArray, resolveAsGraphKey } from '../utils'
import { resolveMeta, resolveNode, resolveNodeId, resolveRelation } from './resolve'

export interface SchemaOrgGraph {
  nodes: SchemaOrgNode[]
  nodeIndex: Map<Id, SchemaOrgNode>
  meta: ResolvedMeta
  push: <T extends Arrayable<Thing>>(node: T) => void
  resolveGraph: (meta: MetaInput) => SchemaOrgNode[]
  find: <T extends Thing>(id: Id | string) => T | null
}

const baseRelationNodes = [
  'translationOfWork',
  'workTranslation',
] as const

// Inline deduplication helpers
function groupBy<T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) {
  return array.reduce((acc, value, index, array) => {
    const key = predicate(value, index, array)
    if (!acc[key])
      acc[key] = []
    acc[key].push(value)
    return acc
  }, {} as { [key: string]: T[] })
}

function uniqueBy<T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) {
  return Object.values(groupBy(array, predicate)).map(a => a[a.length - 1])
}

const merge = createDefu((object, key, value) => {
  if (Array.isArray(object[key])) {
    if (Array.isArray(value)) {
      const map = {} as Record<string, any>
      for (const item of [...object[key], ...value])
        map[hash(item)] = item
      // @ts-expect-error untyped
      object[key] = Object.values(map)
      if (key === 'itemListElement') {
        // @ts-expect-error untyped
        object[key] = [...uniqueBy(object[key], item => item.position)]
      }
      return true
    }
    object[key] = merge(object[key], Array.isArray(value) ? value : [value])
    return true
  }
})

export function createSchemaOrgGraph(): SchemaOrgGraph {
  const ctx: SchemaOrgGraph = {
    find<T extends Thing>(id: Id | string) {
      // if it starts with # we can assume we match any fragment
      // if it starts with / then we need to also match the path
      // if it starts with http we need to match the full url
      let resolver = (s: string) => s
      if (id[0] === '#') {
        // @ts-expect-error untyped
        resolver = resolveAsGraphKey
      }
      else if (id[0] === '/') {
        resolver = (s: string) => s
          .replace(/(https?:)?\/\//, '')
          .split('/')[0]
      }
      const key = resolver(id) as Id

      // O(1) lookup using nodeIndex Map (if populated)
      if (ctx.nodeIndex.size > 0) {
        return ctx.nodeIndex.get(key) as unknown as T || null
      }

      // Fallback to O(n) search during first pass before index is built
      return ctx.nodes
        .filter(n => !!n['@id'])
        .find(n => resolver(n['@id'] as Id) === key) as unknown as T | null
    },
    push(input: Arrayable<Thing>) {
      asArray(input).forEach((node) => {
        const registeredNode = node as SchemaOrgNode
        ctx.nodes.push(registeredNode)
        // Also update nodeIndex if it's been initialized and node has an @id
        if (ctx.nodeIndex.size > 0 && registeredNode['@id']) {
          const nodeId = registeredNode['@id'] as string
          // Fragment-based key (#identity)
          const fragmentKey = resolveAsGraphKey(nodeId) as Id
          ctx.nodeIndex.set(fragmentKey, registeredNode)
          // Full URL key
          ctx.nodeIndex.set(nodeId as Id, registeredNode)
          // Domain-based key for path lookups
          const domainKey = nodeId
            .replace(/(https?:)?\/\//, '')
            .split('/')[0]
          ctx.nodeIndex.set(domainKey as Id, registeredNode)
        }
      })
    },
    resolveGraph(meta: MetaInput) {
      ctx.meta = resolveMeta({ ...meta })

      // First pass: resolve nodes and IDs
      ctx.nodes.forEach((node, key) => {
        const resolver = node._resolver
        node = resolveNode(node, ctx, resolver)
        node = resolveNodeId(node, ctx, resolver, true)
        ctx.nodes[key] = node
      })

      // Inline deduplication: dedupe and normalize in single pass
      const dedupedNodes: Record<Id, SchemaOrgNode> = {}
      for (const key of ctx.nodes.keys()) {
        const n = ctx.nodes[key]
        const nodeKey = resolveAsGraphKey(n['@id'] || hash(n)) as Id
        if (dedupedNodes[nodeKey] && n._dedupeStrategy !== 'replace') {
          dedupedNodes[nodeKey] = merge(ctx.nodes[key], dedupedNodes[nodeKey]) as SchemaOrgNode
        }
        else {
          dedupedNodes[nodeKey] = ctx.nodes[key]
        }
      }
      ctx.nodes = Object.values(dedupedNodes)

      // Build nodeIndex Map for O(1) lookups before resolveRootNode calls
      // Index nodes by multiple key types for different resolver strategies
      ctx.nodeIndex = new Map()
      for (const node of ctx.nodes) {
        if (node['@id']) {
          const nodeId = node['@id'] as string
          // Fragment-based key (#identity)
          const fragmentKey = resolveAsGraphKey(nodeId) as Id
          ctx.nodeIndex.set(fragmentKey, node)
          // Full URL key
          ctx.nodeIndex.set(nodeId as Id, node)
          // Domain-based key for path lookups
          const domainKey = nodeId
            .replace(/(https?:)?\/\//, '')
            .split('/')[0]
          ctx.nodeIndex.set(domainKey as Id, node)
        }
      }

      // Second pass: resolve relations and root nodes (now O(n) with nodeIndex)
      ctx.nodes.forEach((node) => {
        // handle images for all nodes
        if (node.image && typeof node.image === 'string') {
          node.image = resolveRelation(node.image, ctx, imageResolver, {
            root: true,
          })
        }
        baseRelationNodes.forEach((k) => {
          node[k] = resolveRelation(node[k], ctx)
        })
        if (node._resolver?.resolveRootNode)
          node._resolver.resolveRootNode(node, ctx)

        // node is resolved, no longer need resolver
        delete node._resolver
      })

      // Final normalization pass: sort keys and dedupe again
      const normalizedNodes: Record<Id, SchemaOrgNode> = {}
      for (const key of ctx.nodes.keys()) {
        const n = ctx.nodes[key]
        const nodeKey = resolveAsGraphKey(n['@id'] || hash(n)) as Id
        const groupedKeys = groupBy(Object.keys(n), (key) => {
          const val = n[key]
          if (key[0] === '_')
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
        if (normalizedNodes[nodeKey])
          newNode = merge(newNode, normalizedNodes[nodeKey]) as SchemaOrgNode
        normalizedNodes[nodeKey] = newNode
      }

      return Object.values(normalizedNodes)
    },
    nodes: [],
    nodeIndex: new Map(),
    meta: {} as ResolvedMeta,
  }
  return ctx
}
