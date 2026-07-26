import type { Arrayable, Id, MetaInput, ResolvedMeta, SchemaOrgNode, SchemaOrgNodeDefinition, Thing } from '../types'
import { imageResolver } from '../nodes/Image'
import { resolveAsGraphKey, stripNullProperties } from '../utils'
import { resolveMeta, resolveNode, resolveNodeId, resolveRelation } from './resolve'
import { merge } from './util'

export interface SchemaOrgGraph {
  nodes: SchemaOrgNode[]
  nodeIndex: Map<Id, SchemaOrgNode>
  nodeIdCounters: Record<string, number>
  meta: ResolvedMeta
  push: <T extends Arrayable<Thing>>(node: T) => void
  resolveGraph: (meta: MetaInput) => SchemaOrgNode[]
  find: {
    (id: Id | string): SchemaOrgNode | null
    <T extends SchemaOrgNode>(id: Id | string, guard: (node: SchemaOrgNode) => node is T): T | null
  }
}

const DOMAIN_RE = /(?:https?:)?\/\//

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
  const domainKey = nodeId.replace(DOMAIN_RE, '').split('/')[0]
  index.set(domainKey as Id, node)
}

export function createSchemaOrgGraph(): SchemaOrgGraph {
  let ctx: SchemaOrgGraph

  function find(id: Id | string): SchemaOrgNode | null
  function find<T extends SchemaOrgNode>(id: Id | string, guard: (node: SchemaOrgNode) => node is T): T | null
  function find<T extends SchemaOrgNode>(id: Id | string, guard?: (node: SchemaOrgNode) => node is T): SchemaOrgNode | T | null {
    const matchFragment = id[0] === '#'
    const matchDomain = id[0] === '/' && id[1] === '/'
    const key = (matchFragment
      ? resolveAsGraphKey(id)
      : matchDomain
        ? id.replace(DOMAIN_RE, '').split('/')[0]
        : id) as Id

    let node = ctx.nodeIndex.size > 0 ? ctx.nodeIndex.get(key) : undefined
    if (!node) {
      for (let i = 0; i < ctx.nodes.length; i++) {
        const candidate = ctx.nodes[i]
        const nodeId = candidate['@id']
        if (!nodeId)
          continue
        const nodeKey = matchFragment
          ? resolveAsGraphKey(nodeId)
          : matchDomain
            ? nodeId.replace(DOMAIN_RE, '').split('/')[0]
            : nodeId
        if (nodeKey === key) {
          node = candidate
          break
        }
      }
    }

    if (!node || (guard && !guard(node)))
      return null
    return node
  }

  ctx = {
    find,
    push(input: Arrayable<Thing>) {
      if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
          const registeredNode = input[i] as SchemaOrgNode
          ctx.nodes.push(registeredNode)
          if (ctx.nodeIndex.size > 0)
            indexNode(ctx.nodeIndex, registeredNode)
        }
      }
      else {
        const registeredNode = input as SchemaOrgNode
        ctx.nodes.push(registeredNode)
        if (ctx.nodeIndex.size > 0)
          indexNode(ctx.nodeIndex, registeredNode)
      }
    },
    resolveGraph(meta: MetaInput) {
      // Reset counters per graph resolution (instance-scoped, not global)
      for (const k in ctx.nodeIdCounters) delete ctx.nodeIdCounters[k]
      ctx.meta = resolveMeta({ ...meta })
      const len = ctx.nodes.length

      // First pass: resolve nodes and IDs
      for (let i = 0; i < len; i++) {
        let node = ctx.nodes[i]
        const resolver = node._resolver as SchemaOrgNodeDefinition<any, any> | undefined
        node = resolveNode(node, ctx, resolver)
        node = resolveNodeId(node, ctx, resolver, true)
        ctx.nodes[i] = node
      }

      // Dedupe and build nodeIndex in single pass
      const dedupedNodes: Record<Id, SchemaOrgNode> = Object.create(null)
      let hasDuplicates = false
      ctx.nodeIndex.clear()
      for (let i = 0; i < ctx.nodes.length; i++) {
        const n = ctx.nodes[i]
        // Use @id directly - should be set after resolveNodeId
        const nodeKey = resolveAsGraphKey(n['@id']) as Id
        if (dedupedNodes[nodeKey]) {
          hasDuplicates = true
          if (n._dedupeStrategy !== 'replace')
            dedupedNodes[nodeKey] = merge(dedupedNodes[nodeKey], n) as SchemaOrgNode
          else
            dedupedNodes[nodeKey] = n
        }
        else {
          dedupedNodes[nodeKey] = n
        }
      }
      if (hasDuplicates)
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

        const resolver = node._resolver as SchemaOrgNodeDefinition<any, any> | undefined
        if (resolver?.resolveRootNode)
          resolver.resolveRootNode(node, ctx)
      }

      // Delete _resolver before stripping so stripNullProperties does not traverse resolver objects
      for (let i = 0; i < ctx.nodes.length; i++)
        delete ctx.nodes[i]._resolver

      // Strip null opt-out sentinels after ALL resolveRootNode calls complete
      // so that later resolvers can still observe null sentinels on earlier nodes
      for (let i = 0; i < ctx.nodes.length; i++)
        stripNullProperties(ctx.nodes[i])

      // Final normalization: sort keys and dedupe only if new nodes were added
      const needsDedupe = ctx.nodes.length > countBeforeRelations
      const normalizedNodes: Record<Id, SchemaOrgNode> = needsDedupe ? Object.create(null) : null!
      const result: SchemaOrgNode[] = needsDedupe ? null! : []

      for (let i = 0; i < ctx.nodes.length; i++) {
        const n = ctx.nodes[i]
        const nodeKey = resolveAsGraphKey(n['@id']) as Id

        const keys = Object.keys(n)
        keys.sort()

        // Build primitives first, followed by relations, both alphabetically.
        const newNode = {} as SchemaOrgNode
        let relationCount = 0
        for (let j = 0; j < keys.length; j++) {
          const k = keys[j]
          if (k[0] === '_')
            continue
          const v = n[k]
          if (v !== null && (Array.isArray(v) || typeof v === 'object'))
            keys[relationCount++] = k
          else
            newNode[k] = v
        }
        for (let j = 0; j < relationCount; j++) {
          const k = keys[j]
          newNode[k] = n[k]
        }

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
    nodeIdCounters: Object.create(null),
    meta: resolveMeta({}),
  }
  return ctx
}
