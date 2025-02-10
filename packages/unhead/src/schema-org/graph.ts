import type { Arrayable, Id, MetaInput, ResolvedMeta, SchemaOrgGraph, SchemaOrgNode, Thing } from './types'
import { imageResolver } from './nodes'
import {
  asArray,
  normalizeNodes,
  resolveAsGraphKey,
  resolveMeta,
  resolveNode,
  resolveNodeId,
  resolveRelation,
} from './util'

const baseRelationNodes = [
  'translationOfWork',
  'workTranslation',
] as const

export function createSchemaOrgGraph(): SchemaOrgGraph {
  const ctx: SchemaOrgGraph = {
    graphIds: new Map<string, number>(),
    graphMap: new Map<string, SchemaOrgNode>(),
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
      return ctx.nodes
        .filter(n => !!n['@id'])
        .find(n => resolver(n['@id'] as Id) === key) as unknown as T | null
    },
    push(input: Arrayable<Thing>) {
      asArray(input).forEach((node) => {
        const registeredNode = node as SchemaOrgNode
        ctx.nodes.push(registeredNode)
      })
    },
    resolveGraph(meta: MetaInput) {
      ctx.meta = resolveMeta({ ...meta })
      ctx.nodes
        .forEach((node, key) => {
          const resolver = node._resolver
          node = resolveNode(node, ctx, resolver)
          node = resolveNodeId(node, ctx, resolver, true)
          ctx.nodes[key] = node
        })
      // ctx.nodes = dedupeNodes(ctx.nodes)

      ctx.nodes
        .forEach((node) => {
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

      return normalizeNodes(ctx.nodes)
    },
    nodes: [],
    meta: {} as ResolvedMeta,
  }
  return ctx
}
