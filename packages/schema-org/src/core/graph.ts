import type { Arrayable, Id, MetaInput, ResolvedMeta, SchemaOrgNode, Thing } from '../types'
import { imageResolver } from '../nodes'
import { asArray, hashCode, resolveAsGraphKey } from '../utils'
import { resolveMeta, resolveNode, resolveNodeId, resolveRelation } from './resolve'
import { merge, uniqueBy } from './util'

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

// Helper to index a node by multiple key types for fast lookups
function indexNode(index: Map<Id, SchemaOrgNode>, node: SchemaOrgNode) {
  if (!node['@id'])
    return

  const nodeId = node['@id'] as string
  // Fragment-based key (#identity)
  const fragmentKey = resolveAsGraphKey(nodeId) as Id
  index.set(fragmentKey, node)
  // Full URL key
  index.set(nodeId as Id, node)
  // Domain-based key for path lookups
  const domainKey = nodeId.replace(/(https?:)?\/\//, '').split('/')[0]
  index.set(domainKey as Id, node)
}

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
        // Update nodeIndex if it's been initialized
        if (ctx.nodeIndex.size > 0)
          indexNode(ctx.nodeIndex, registeredNode)
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
        const nodeKey = resolveAsGraphKey(n['@id'] || hashCode(JSON.stringify(n))) as Id
        if (dedupedNodes[nodeKey] && n._dedupeStrategy !== 'replace') {
          dedupedNodes[nodeKey] = merge(dedupedNodes[nodeKey], ctx.nodes[key]) as SchemaOrgNode
        }
        else {
          dedupedNodes[nodeKey] = ctx.nodes[key]
        }
      }
      ctx.nodes = Object.values(dedupedNodes)

      // Build nodeIndex Map for O(1) lookups before resolveRootNode calls
      ctx.nodeIndex = new Map()
      for (const node of ctx.nodes)
        indexNode(ctx.nodeIndex, node)

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

      // Final normalization pass: sort keys (primitives first, then relations) and dedupe again
      const normalizedNodes: Record<Id, SchemaOrgNode> = {}
      for (const key of ctx.nodes.keys()) {
        const n = ctx.nodes[key]
        const nodeKey = resolveAsGraphKey(n['@id'] || hashCode(JSON.stringify(n))) as Id

        // Sort keys: primitives first (alphabetically), then relations (alphabetically), ignore _ prefixed
        const sortedKeys = Object.keys(n)
          .filter(k => k[0] !== '_')
          .sort((a, b) => {
            const aIsRelation = Array.isArray(n[a]) || typeof n[a] === 'object'
            const bIsRelation = Array.isArray(n[b]) || typeof n[b] === 'object'
            // Both same type: alphabetical order
            if (aIsRelation === bIsRelation)
              return a.localeCompare(b)
            // Primitives before relations
            return aIsRelation ? 1 : -1
          })

        // Build normalized node with sorted keys
        const newNode = {} as SchemaOrgNode
        for (const key of sortedKeys)
          newNode[key] = n[key]

        // Merge if duplicate
        normalizedNodes[nodeKey] = normalizedNodes[nodeKey]
          ? merge(normalizedNodes[nodeKey], newNode) as SchemaOrgNode
          : newNode
      }

      return Object.values(normalizedNodes)
    },
    nodes: [],
    nodeIndex: new Map(),
    meta: {} as ResolvedMeta,
  }
  return ctx
}
