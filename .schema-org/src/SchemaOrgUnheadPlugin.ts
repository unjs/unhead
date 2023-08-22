import type { HeadPlugin } from '@unhead/schema'
import type { MetaInput, ResolvedMeta } from './types'
import {
  createSchemaOrgGraph, resolveMeta,
} from '.'
import type { SchemaOrgGraph } from '.'

export function SchemaOrgUnheadPlugin(config: MetaInput, meta: () => Record<string, any>): any {
  config = resolveMeta({ ...config })
  let graph: SchemaOrgGraph
  const resolvedMeta = {} as ResolvedMeta
  return <HeadPlugin> ({
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
        if (tag.tag === 'title')
          resolvedMeta.title = tag.textContent
        else if (tag.tag === 'meta' && tag.props.name === 'description')
          resolvedMeta.description = tag.props.content
        else if (tag.tag === 'link' && tag.props.rel === 'canonical')
          resolvedMeta.url = tag.props.href
        else if (tag.tag === 'meta' && tag.props.property === 'og:image')
          resolvedMeta.image = tag.props.content
      },
      'tags:resolve': async function (ctx) {
        // find the schema.org node
        for (const tag of ctx.tags) {
          if (tag.tag === 'script' && tag.key === 'schema-org-graph') {
            tag.innerHTML = JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': graph.resolveGraph({ ...config, ...resolvedMeta, ...(await meta()) }),
            }, null, 2)
            delete tag.props.nodes
          }
        }
      },
    },
  })
}
