import type { HeadPlugin, HeadTag, Unhead } from 'unhead/types'
import type { SchemaOrgGraph } from './core/graph'
import type { MetaInput, ResolvedMeta } from './types'
import { defineHeadPlugin, TemplateParamsPlugin } from 'unhead/plugins'
import { hasOwn, processTemplateParams } from 'unhead/utils'
import {
  createSchemaOrgGraph,
} from './core/graph'
import { resolveMeta } from './core/resolve'

// Simple merge utility that recursively merges objects
function mergeObjects(target: any, source: any): any {
  const result = { ...target }
  for (const key in source) {
    if (!hasOwn(source, key) || source[key] === undefined || key === '__proto__' || key === 'constructor' || key === 'prototype')
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

function isSchemaOrgTag(tag: HeadTag) {
  return (tag.tag === 'script' && tag.attrs.type === 'application/ld+json' && tag.attrs.nodes) || tag.key === 'schema-org-graph'
}

export interface PluginSchemaOrgOptions {
  minify?: boolean
  trailingSlash?: boolean
}

export function UnheadSchemaOrg(config: MetaInput = {} as MetaInput, meta: () => Partial<MetaInput> = () => ({}), options?: PluginSchemaOrgOptions) {
  config = resolveMeta({ ...config })
  let graph: SchemaOrgGraph
  let resolvedMeta: Partial<ResolvedMeta> = {}
  return defineHeadPlugin((head: Unhead): HeadPlugin => {
    head.use(TemplateParamsPlugin)
    function collectTag(tag: HeadTag) {
      if (tag.tag === 'script' && tag.attrs.type === 'application/ld+json' && (tag.attrs.nodes || tag.key === 'schema-org-graph')) {
        // this is a bit expensive, load in seperate chunk
        const nodes = tag.attrs.nodes
        if (nodes) {
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
        }
        tag.tagPosition = tag.tagPosition || (config.tagPosition === 'head' ? 'head' : 'bodyClose')
      }
      if (tag.tag === 'htmlAttrs' && typeof tag.attrs.lang === 'string') {
        resolvedMeta.inLanguage = tag.attrs.lang
      }
      else if (tag.tag === 'title' && tag.textContent != null && typeof tag.textContent !== 'function') {
        resolvedMeta.title = String(tag.textContent)
      }
      else if (tag.tag === 'meta' && tag.attrs.name === 'description' && typeof tag.attrs.content === 'string') {
        resolvedMeta.description = tag.attrs.content
      }
      else if (tag.tag === 'link' && tag.attrs.rel === 'canonical' && typeof tag.attrs.href === 'string') {
        resolvedMeta.url = tag.attrs.href
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
      else if (tag.tag === 'meta' && tag.attrs.property === 'og:image' && typeof tag.attrs.content === 'string') {
        resolvedMeta.image = tag.attrs.content
      }
      // use template params
      else if (tag.tag === 'templateParams' && tag.attrs.schemaOrg) {
        resolvedMeta = {
          ...resolvedMeta,
          ...(tag.attrs.schemaOrg as unknown as Record<string, any>),
        }
      }
    }
    return {
      key: 'schema-org',
      hooks: {
        'entries:resolve': (ctx) => {
          graph = graph || createSchemaOrgGraph()
          // Reset graph nodes each cycle so disposed entries don't leave stale nodes.
          graph.nodes = []
          graph.nodeIndex.clear()
          resolvedMeta = {}
          for (const entry of ctx.entries) {
            if (entry._tags) {
              if (entry._tags.some(isSchemaOrgTag)) {
                delete entry._tags
                continue
              }
              for (const tag of entry._tags)
                collectTag(tag)
            }
          }
        },
        'entries:normalize': ({ tags }) => {
          for (const tag of tags)
            collectTag(tag)
        },
        'tags:resolve': (ctx) => {
          // find the schema.org node, should be a single instance
          for (const k in ctx.tags) {
            const tag = ctx.tags[k]
            // nodes can resolve to nullish at runtime (reactive no-op input), match by key too
            if (tag.tag === 'script' && tag.attrs.type === 'application/ld+json' && (tag.attrs.nodes || tag.key === 'schema-org-graph')) {
              delete tag.attrs.nodes
              const resolvedGraph = graph.resolveGraph({ ...(meta?.() || {}), ...config, ...resolvedMeta })
              if (!resolvedGraph.length) {
                // removes the tag
                tag.attrs = tag.props = {}
                return
              }
              // eslint-disable-next-line node/prefer-global/process
              const minify = options?.minify || process.env.NODE_ENV === 'production'
              tag.innerHTML = JSON.stringify({
                '@context': 'https://schema.org',
                '@graph': resolvedGraph,
              }, (_, value) => {
                // process template params here
                if (typeof value === 'string')
                  return processTemplateParams(value, head._templateParams!, head._separator!)
                return value
              }, minify ? 0 : 2)
              return
            }
          }
        },
        'tags:afterResolve': (ctx) => {
          let firstNodeIdx: number | undefined
          let toRemove: Set<number> | undefined
          for (let i = 0; i < ctx.tags.length; i++) {
            const tag = ctx.tags[i]
            if (!tag?.attrs)
              continue
            if (isSchemaOrgTag(tag)) {
              delete tag.attrs.nodes
              if (typeof firstNodeIdx === 'undefined') {
                firstNodeIdx = i
                continue
              }
              // merge attrs on to first node and delete
              const merged = mergeObjects(ctx.tags[firstNodeIdx].attrs, tag.attrs)
              ctx.tags[firstNodeIdx].attrs = ctx.tags[firstNodeIdx].props = merged
              delete ctx.tags[firstNodeIdx].attrs.nodes
              ;(toRemove ||= new Set()).add(i)
            }
          }
          // there may be multiple script nodes within the same entry
          if (toRemove)
            ctx.tags = ctx.tags.filter((_: unknown, i: number) => !toRemove.has(i))
        },
      },
    }
  }, 'schema-org')
}
