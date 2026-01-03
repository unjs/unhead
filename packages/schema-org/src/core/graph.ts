import type { Arrayable, Id, MetaInput, ResolvedMeta, SchemaOrgNode, Thing } from '../types'
import { imageResolver } from '../nodes'
import { asArray, resolveAsGraphKey } from '../utils'
import { resolveMeta, resolveNode, resolveNodeId, resolveRelation } from './resolve'
import { merge } from './util'

export interface SchemaOrgGraph {
  nodes: SchemaOrgNode[]
  nodeIndex: Map<Id, SchemaOrgNode>
  nodeIdCounters: Record<string, number>
  meta: ResolvedMeta
  push: <T extends Arrayable<Thing>>(node: T) => void
  resolveGraph: (meta: MetaInput) => SchemaOrgNode[]
  find: <T extends Thing>(id: Id | string) => T | null
}

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
      // Reset counters per graph resolution (instance-scoped, not global)
      for (const k in ctx.nodeIdCounters) delete ctx.nodeIdCounters[k]
      ctx.meta = resolveMeta({ ...meta })
      const len = ctx.nodes.length

      // First pass: resolve nodes and IDs
      for (let i = 0; i < len; i++) {
        let node = ctx.nodes[i]
        const resolver = node._resolver
        node = resolveNode(node, ctx, resolver)
        node = resolveNodeId(node, ctx, resolver, true)
        ctx.nodes[i] = node
      }

      // Dedupe and build nodeIndex in single pass
      const dedupedNodes: Record<Id, SchemaOrgNode> = {}
      ctx.nodeIndex = new Map()
      for (let i = 0; i < ctx.nodes.length; i++) {
        const n = ctx.nodes[i]
        // Use @id directly - should be set after resolveNodeId
        const nodeKey = resolveAsGraphKey(n['@id']) as Id
        if (dedupedNodes[nodeKey]) {
          if (n._dedupeStrategy !== 'replace')
            dedupedNodes[nodeKey] = merge(dedupedNodes[nodeKey], n) as SchemaOrgNode
          else
            dedupedNodes[nodeKey] = n
        }
        else {
          dedupedNodes[nodeKey] = n
        }
      }
      ctx.nodes = Object.values(dedupedNodes)
      // Index after dedupe so we have final merged nodes
      for (let i = 0; i < ctx.nodes.length; i++)
        indexNode(ctx.nodeIndex, ctx.nodes[i])

      // Track count before relations to detect new nodes
      const countBeforeRelations = ctx.nodes.length

      // Second pass: resolve relations and root nodes
      for (let i = 0; i < ctx.nodes.length; i++) {
        const node = ctx.nodes[i]
        // handle images for all nodes
        if (node.image && typeof node.image === 'string') {
          node.image = resolveRelation(node.image, ctx, imageResolver, {
            root: true,
          })
        }
        // Unrolled loop for baseRelationNodes (faster than forEach)
        node.translationOfWork = resolveRelation(node.translationOfWork, ctx)
        node.workTranslation = resolveRelation(node.workTranslation, ctx)

        if (node._resolver?.resolveRootNode)
          node._resolver.resolveRootNode(node, ctx)

        delete node._resolver
      }

      // Final normalization: sort keys and dedupe only if new nodes were added
      const needsDedupe = ctx.nodes.length > countBeforeRelations
      const normalizedNodes: Record<Id, SchemaOrgNode> = needsDedupe ? {} : null!
      const result: SchemaOrgNode[] = needsDedupe ? null! : []

      for (let i = 0; i < ctx.nodes.length; i++) {
        const n = ctx.nodes[i]
        const nodeKey = resolveAsGraphKey(n['@id']) as Id

        // Partition keys into primitives and relations
        const keys = Object.keys(n)
        const primitives: string[] = []
        const relations: string[] = []
        for (let j = 0; j < keys.length; j++) {
          const k = keys[j]
          if (k[0] === '_')
            continue
          const v = n[k]
          if (v !== null && (Array.isArray(v) || typeof v === 'object'))
            relations.push(k)
          else
            primitives.push(k)
        }
        // Simple string sort (faster than localeCompare)
        primitives.sort()
        relations.sort()

        // Build normalized node
        const newNode = {} as SchemaOrgNode
        for (let j = 0; j < primitives.length; j++)
          newNode[primitives[j]] = n[primitives[j]]
        for (let j = 0; j < relations.length; j++)
          newNode[relations[j]] = n[relations[j]]

        if (needsDedupe) {
          normalizedNodes[nodeKey] = normalizedNodes[nodeKey]
            ? merge(normalizedNodes[nodeKey], newNode) as SchemaOrgNode
            : newNode
        }
        else {
          result.push(newNode)
        }
      }

      return needsDedupe ? Object.values(normalizedNodes) : result
    },
    nodes: [],
    nodeIndex: new Map(),
    nodeIdCounters: {},
    meta: {} as ResolvedMeta,
  }
  return ctx
}
