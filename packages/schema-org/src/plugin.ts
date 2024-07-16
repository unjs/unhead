import { defineHeadPlugin, processTemplateParams } from '@unhead/shared'
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
  const fallback = () => ({} as Partial<MetaInput>)
  return SchemaOrgUnheadPlugin({} as MetaInput, options?.resolveMeta || fallback, options)
}

/**
 * @deprecated Providing a plugin is no longer required. You can remove this code.
 */
export function SchemaOrgUnheadPlugin(config: MetaInput, meta: () => Partial<MetaInput> | Promise<Partial<MetaInput>>, options?: PluginSchemaOrgOptions) {
  config = resolveMeta({ ...config })
  let graph: SchemaOrgGraph
  let resolvedMeta = {} as ResolvedMeta
  return defineHeadPlugin(head => ({
    key: 'schema-org',
    hooks: {
      'entries:resolve': () => {
        graph = createSchemaOrgGraph()
      },
      'tag:normalise': async ({ tag }) => {
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
          tag.tagPosition = tag.tagPosition || config.tagPosition === 'head' ? 'head' : 'bodyClose'
        }
        if (tag.tag === 'htmlAttrs' && tag.props.lang) { resolvedMeta.inLanguage = tag.props.lang }
        else if (tag.tag === 'title') { resolvedMeta.title = tag.textContent }
        else if (tag.tag === 'meta' && tag.props.name === 'description') { resolvedMeta.description = tag.props.content }
        else if (tag.tag === 'link' && tag.props.rel === 'canonical') {
          resolvedMeta.url = tag.props.href
          if (resolvedMeta.url && !resolvedMeta.host)
          // may be using template params that aren't resolved
          {
            try {
              resolvedMeta.host = new URL(resolvedMeta.url).origin
            }
            catch {}
          }
        }
        else if (tag.tag === 'meta' && tag.props.property === 'og:image') { resolvedMeta.image = tag.props.content }
        // use template params
        else if (tag.tag === 'templateParams' && tag.props.schemaOrg) {
          resolvedMeta = {
            ...resolvedMeta,
            // @ts-expect-error untyped
            ...tag.props.schemaOrg,
          }
          delete tag.props.schemaOrg
        }
      },
      'tags:resolve': async (ctx) => {
        // find the schema.org node, should be a single instance
        for (const tag of ctx.tags) {
          if (tag.tag === 'script' && tag.key === 'schema-org-graph') {
            const minify = options?.minify || process.env.NODE_ENV === 'production'
            tag.innerHTML = JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': graph.resolveGraph({ ...(await meta?.() || {}), ...config, ...resolvedMeta }),
            }, (_, value) => {
              // process template params here
              if (typeof value !== 'object')
                return processTemplateParams(value, head._templateParams!, head._separator!)
              return value
            }, minify ? 0 : 2)
            delete tag.props.nodes
            return
          }
        }
      },
    },
  }))
}
