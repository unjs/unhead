import { defineHeadPlugin } from '@unhead/shared'
import type { MetaInput, ResolvedMeta } from './types'
import {
  createSchemaOrgGraph,
  resolveMeta,
} from '.'
import type { SchemaOrgGraph } from '.'

export interface PluginSchemaOrgOptions {
  minify?: boolean
  trailingSlash?: boolean
}

export function UnheadSchemaOrg(options?: PluginSchemaOrgOptions) {
  return SchemaOrgUnheadPlugin({} as MetaInput, () => ({}), options)
}

/**
 * @deprecated Providing a plugin is no longer required. You can remove this code.
 */
export function PluginSchemaOrg(options?: PluginSchemaOrgOptions & { resolveMeta?: () => Record<string, any> }) {
  const fallback = () => ({})
  return SchemaOrgUnheadPlugin({} as MetaInput, options?.resolveMeta || fallback, options)
}

/**
 * @deprecated Providing a plugin is no longer required. You can remove this code.
 */
export function SchemaOrgUnheadPlugin(config: MetaInput, meta: () => Record<string, any>, options?: PluginSchemaOrgOptions) {
  config = resolveMeta({ ...config })
  let graph: SchemaOrgGraph
  let resolvedMeta = {} as ResolvedMeta
  return defineHeadPlugin({
    key: 'schema-org',
    hooks: {
      'entries:resolve': function () {
        graph = createSchemaOrgGraph()
      },
      'tag:normalise': async function ({ tag }) {
        if (tag.key === 'schema-org-graph') {
          // this is a bit expensive, load in seperate chunk
          const { loadResolver } = await import('./resolver')
          const nodes = await tag.props.nodes
          for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
            const newNode = {
              ...node,
              _resolver: loadResolver(await node._resolver),
            }
            graph.push(newNode)
          }
          tag.tagPosition = config.tagPosition === 'head' ? 'head' : 'bodyClose'
        }
        if (tag.tag === 'htmlAttrs' && tag.props.lang) { resolvedMeta.inLanguage = tag.props.lang }
        else if (tag.tag === 'title') { resolvedMeta.title = tag.textContent }
        else if (tag.tag === 'meta' && tag.props.name === 'description') { resolvedMeta.description = tag.props.content }
        else if (tag.tag === 'link' && tag.props.rel === 'canonical') {
          resolvedMeta.url = tag.props.href
          if (resolvedMeta.url && !resolvedMeta.host)
            // may be using template params that aren't resolved
            try {
              resolvedMeta.host = new URL(resolvedMeta.url).origin
            } catch {}
        }
        else if (tag.tag === 'meta' && tag.props.property === 'og:image') { resolvedMeta.image = tag.props.content }
        // use template params
        else if (tag.tag === 'templateParams' && tag.props.schemaOrg) {
          resolvedMeta = {
            // @ts-expect-error untyped
            ...tag.props.schemaOrg,
            ...resolvedMeta,
          }
          delete tag.props.schemaOrg
        }
      },
      'tags:resolve': async function (ctx) {
        // find the schema.org node
        for (const tag of ctx.tags) {
          if (tag.tag === 'script' && tag.key === 'schema-org-graph') {
            const minify = options?.minify || process.env.NODE_ENV === 'production'
            tag.innerHTML = JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': graph.resolveGraph({ ...config, ...resolvedMeta, ...(await meta?.() || {}) }),
            }, null, minify ? 0 : 2)
            delete tag.props.nodes
          }
        }
      },
    },
  })
}
