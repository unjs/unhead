import type { SchemaOrgGraph } from './core/graph'
import type { MetaInput, ResolvedMeta } from './types'
import { defineHeadPlugin, TemplateParamsPlugin } from 'unhead/plugins'
import { processTemplateParams } from 'unhead/utils'
import {
  createSchemaOrgGraph,
} from './core/graph'
import { resolveMeta } from './core/resolve'

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

// Simple merge utility that recursively merges objects
function mergeObjects(target: any, source: any): any {
  const result = { ...target }
  for (const key in source) {
    if (!Object.hasOwn(source, key) || source[key] === undefined || UNSAFE_KEYS.has(key))
      continue

    const isNestedObject = result[key]
      && typeof result[key] === 'object'
      && typeof source[key] === 'object'
      && !Array.isArray(result[key])
      && !Array.isArray(source[key])

    if (isNestedObject)
      result[key] = mergeObjects(result[key], source[key])
    else if (!result[key])
      result[key] = source[key]
  }
  return result
}

export interface PluginSchemaOrgOptions {
  minify?: boolean
  trailingSlash?: boolean
}

export function UnheadSchemaOrg(config: MetaInput = {} as MetaInput, meta: () => Partial<MetaInput> | Promise<Partial<MetaInput>> = () => ({}), options?: PluginSchemaOrgOptions) {
  config = resolveMeta({ ...config })
  let graph: SchemaOrgGraph
  let resolvedMeta = {} as ResolvedMeta
  return defineHeadPlugin((head) => {
    head.use(TemplateParamsPlugin)
    return {
      key: 'schema-org',
      hooks: {
        'entries:resolve': (ctx) => {
          graph = graph || createSchemaOrgGraph()
          // Reset graph nodes each cycle so disposed entries don't leave stale nodes.
          // Force all entries to re-normalize so their nodes are re-pushed to the graph.
          graph.nodes = []
          graph.nodeIndex = new Map()
          for (const entry of ctx.entries) {
            delete entry._tags
          }
        },
        'entries:normalize': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag === 'script' && tag.props.type === 'application/ld+json' && tag.props.nodes) {
              // this is a bit expensive, load in seperate chunk
              const nodes = tag.props.nodes
              for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
                // malformed input - skip null/undefined but allow empty objects
                if (typeof node !== 'object' || node === null) {
                  continue
                }

                const newNode = {
                  ...node,
                  _dedupeStrategy: tag.tagDuplicateStrategy,
                }
                // Push node (it already has _resolver if it came from a defineXXX function)
                graph.push(newNode)
              }
              tag.tagPosition = tag.tagPosition || config.tagPosition === 'head' ? 'head' : 'bodyClose'
            }
            if (tag.tag === 'htmlAttrs' && tag.props.lang) {
              resolvedMeta.inLanguage = tag.props.lang
            }
            else if (tag.tag === 'title') {
              resolvedMeta.title = tag.textContent
            }
            else if (tag.tag === 'meta' && tag.props.name === 'description') {
              resolvedMeta.description = tag.props.content
            }
            else if (tag.tag === 'link' && tag.props.rel === 'canonical') {
              resolvedMeta.url = tag.props.href
              // may be using template params that aren't resolved
              if (resolvedMeta.url && !resolvedMeta.host) {
                try {
                  resolvedMeta.host = new URL(resolvedMeta.url).origin
                }
                catch {
                  // Canonical URLs may contain unresolved template params; leave host unset.
                }
              }
            }
            else if (tag.tag === 'meta' && tag.props.property === 'og:image') {
              resolvedMeta.image = tag.props.content
            }
            // use template params
            else if (tag.tag === 'templateParams' && tag.props.schemaOrg) {
              resolvedMeta = {
                ...resolvedMeta,
                ...(tag.props.schemaOrg as Record<string, any>),
              }
              delete tag.props.schemaOrg
            }
          }
        },
        'tags:resolve': (ctx) => {
          // find the schema.org node, should be a single instance
          const tags = ctx.tags
          for (let i = 0; i < tags.length; i++) {
            const tag = tags[i]
            if (tag.tag === 'script' && tag.props.type === 'application/ld+json' && tag.props.nodes) {
              // resolved tags are immutable: replace with a new tag without `nodes`
              const { nodes: _nodes, ...props } = tag.props
              const resolvedGraph = graph.resolveGraph({ ...(meta?.() || {}), ...config, ...resolvedMeta })
              if (!resolvedGraph.length) {
                // removes the tag
                tags[i] = { ...tag, props: {} }
                return
              }
              // eslint-disable-next-line node/prefer-global/process
              const minify = options?.minify || process.env.NODE_ENV === 'production'
              tags[i] = {
                ...tag,
                props,
                innerHTML: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@graph': resolvedGraph,
                }, (_, value) => {
                  // process template params here
                  if (typeof value !== 'object')
                    return processTemplateParams(value, head._templateParams!, head._separator!)
                  return value
                }, minify ? 0 : 2),
              }
              return
            }
          }
        },
        'tags:afterResolve': (ctx) => {
          let firstNodeIdx: number | undefined
          const toRemove = new Set<number>()
          for (let i = 0; i < ctx.tags.length; i++) {
            const tag = ctx.tags[i]
            if (!tag?.props)
              continue
            if ((tag.props.type === 'application/ld+json' && tag.props.nodes) || tag.key === 'schema-org-graph') {
              if (typeof firstNodeIdx === 'undefined') {
                firstNodeIdx = i
                if (tag.props.nodes) {
                  const { nodes: _nodes, ...props } = tag.props
                  ctx.tags[i] = { ...tag, props }
                }
                continue
              }
              // merge props on to first node and delete
              const first = ctx.tags[firstNodeIdx]
              const { nodes: _nodes, ...merged } = mergeObjects(first.props, tag.props)
              ctx.tags[firstNodeIdx] = { ...first, props: merged }
              toRemove.add(i)
            }
          }
          // there may be multiple script nodes within the same entry
          if (toRemove.size)
            ctx.tags = ctx.tags.filter((_: unknown, i: number) => !toRemove.has(i))
        },
      },
    }
  })
}
