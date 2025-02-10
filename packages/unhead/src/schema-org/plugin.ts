import type { ResolvedMeta, SchemaOrgGraph } from './types'
import { defineHeadPlugin, processTemplateParams } from '../utils'
import { SchemaOrgNodeResolverMap } from './const'
import { createSchemaOrgGraph } from './graph'

export const SchemaOrgPlugin = /* @__PURE__ */ defineHeadPlugin((head) => {
  let graph: SchemaOrgGraph
  let resolvedMeta = {} as ResolvedMeta

  const processTag = (tag: any) => {
    const { tag: tagName, props, textContent } = tag
    const metaMap: Record<string, () => void> = {
      htmlAttrs: () => props.lang && (resolvedMeta.inLanguage = props.lang),
      title: () => resolvedMeta.title = textContent,
      meta: () => {
        if (props.name === 'description')
          resolvedMeta.description = props.content
        else if (props.property === 'og:image')
          resolvedMeta.image = props.content
      },
      link: () => {
        if (props.rel === 'canonical') {
          resolvedMeta.url = props.href
          if (resolvedMeta.url && !resolvedMeta.host) {
            try { resolvedMeta.host = new URL(resolvedMeta.url).origin }
            catch {}
          }
        }
      },
      templateParams: () => {
        if (props.schemaOrg) {
          resolvedMeta = { ...resolvedMeta, ...props.schemaOrg }
          delete props.schemaOrg
        }
      },
    }

    metaMap[tagName]?.()
  }

  return {
    key: 'schema-org',
    hooks: {
      'entries:resolve': () => graph = createSchemaOrgGraph(),
      'tags:beforeResolve': async ({ tags }) => tags.forEach(processTag),
      'tags:resolve': async ({ tagMap }) => {
        const tag = tagMap.get('script:key:schema-org-graph')
        if (!tag)
          return

        const nodes = tag.props._nodes
        delete tag.props._nodes
        ;(Array.isArray(nodes) ? nodes : [nodes]).forEach((node) => {
          if (typeof node !== 'object' || !Object.keys(node).length || !(node._resolver in SchemaOrgNodeResolverMap))
            return
          graph.push({
            ...node,
            _dedupeStrategy: tag.tagDuplicateStrategy,
            _resolver: SchemaOrgNodeResolverMap[node._resolver],
          })
        })
        const resolvedGraph = graph.resolveGraph(resolvedMeta)
        if (!resolvedGraph.length) {
          tag.props = {}
          return
        }
        tag.innerHTML = processTemplateParams(JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': resolvedGraph,
        }, null, 2), head._templateParams || {}, head._separator || '|', true)
      },
    },
  }
})
