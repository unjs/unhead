import { hashCode } from '@unhead/shared'
import { hasTrailingSlash, joinURL, withoutTrailingSlash, withTrailingSlash } from 'ufo'
import { loadResolver } from '../resolver'
import { asArray, idReference, prefixId, setIfEmpty, stripEmptyProperties } from '../utils'
import type {
  Arrayable,
  MetaInput,
  ResolvedMeta,
  SchemaOrgNodeDefinition,
  Thing,
} from '../types'
import type { ResolverOptions } from '../utils'
import type { SchemaOrgGraph } from './graph'

export function resolveMeta(meta: Partial<MetaInput>) {
  if (!meta.host && meta.canonicalHost)
    meta.host = meta.canonicalHost
  if (!meta.tagPosition && meta.position)
    meta.tagPosition = meta.position
  if (!meta.currency && meta.defaultCurrency)
    meta.currency = meta.defaultCurrency
  if (!meta.inLanguage && meta.defaultLanguage)
    meta.inLanguage = meta.defaultLanguage
  if (!meta.path)
    meta.path = '/'

  if (!meta.host && typeof document !== 'undefined')
    meta.host = document.location.host

  if (!meta.url && meta.canonicalUrl)
    meta.url = meta.canonicalUrl

  if (meta.path !== '/') {
    if (meta.trailingSlash && !hasTrailingSlash(meta.path))
      meta.path = withTrailingSlash(meta.path)
    else if (!meta.trailingSlash && hasTrailingSlash(meta.path))
      meta.path = withoutTrailingSlash(meta.path)
  }

  meta.url = joinURL(meta.host || '', meta.path)

  return <ResolvedMeta> {
    ...meta,
    host: meta.host,
    url: meta.url,
    currency: meta.currency,
    image: meta.image,
    inLanguage: meta.inLanguage,
    title: meta.title,
    description: meta.description,
    datePublished: meta.datePublished,
    dateModified: meta.dateModified,
  }
}

export function resolveNode<T extends Thing>(node: T, ctx: SchemaOrgGraph, resolver: SchemaOrgNodeDefinition<T>) {
  // allow casting from a primitive to an object
  if (resolver?.cast)
    node = resolver.cast(node, ctx)

  // handle defaults
  if (resolver?.defaults) {
    // handle defaults
    let defaults = resolver.defaults || {}
    if (typeof defaults === 'function')
      defaults = defaults(ctx)
    node = {
      ...defaults,
      ...node,
    }
  }

  // handle meta inherits
  resolver.inheritMeta?.forEach((entry) => {
    if (typeof entry === 'string')
      setIfEmpty(node, entry, ctx.meta[entry])
    else
      setIfEmpty(node, entry.key, ctx.meta[entry.meta])
  })

  // handle resolve
  if (resolver?.resolve)
    node = resolver.resolve(node, ctx)

  // if user registers some resolver we haven't coded
  for (const k in node) {
    const v = node[k]
    if (typeof v === 'object' && v?._resolver)
      node[k] = resolveRelation(v, ctx, v._resolver)
  }
  stripEmptyProperties(node)
  return node
}

export function resolveNodeId<T extends Thing>(node: T, ctx: SchemaOrgGraph, resolver?: SchemaOrgNodeDefinition<T>, resolveAsRoot = false) {
  // already fully qualified
  if (node['@id'] && node['@id'].startsWith('http'))
    return node

  const prefix = resolver ? (Array.isArray(resolver.idPrefix) ? resolver.idPrefix[0] : resolver.idPrefix) || 'url' : 'url'
  const rootId = node['@id'] || (resolver ? (Array.isArray(resolver.idPrefix) ? resolver.idPrefix?.[1] : undefined) : '')

  if (!node['@id'] && resolveAsRoot && rootId) {
    // transform ['host', PrimaryWebPageId] to https://host.com/#webpage
    // allow overriding root ids
    node['@id'] = prefixId(ctx.meta[prefix], rootId)
    return node
  }
  if (node['@id']?.startsWith('#/schema/') || node['@id']?.startsWith('/')) {
    node['@id'] = prefixId(ctx.meta[prefix], node['@id'])
    return node
  }
  // transform 'host' to https://host.com/#schema/webpage/gj5g59gg
  let alias = resolver?.alias
  if (!alias) {
    const type = asArray(node['@type'])?.[0] || ''
    // kebab case type
    alias = type.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }
  const hashNodeData: Record<string, any> = {}
  for (const key in node) {
    if (key[0] === '_') {
      continue
    }

    if (!Object.prototype.hasOwnProperty.call(node, key)) {
      continue
    }

    hashNodeData[key] = node[key]
  }

  node['@id'] = prefixId(ctx.meta[prefix], `#/schema/${alias}/${node['@id'] || hashCode(JSON.stringify(hashNodeData))}`)
  return node
}

export function resolveRelation(input: Arrayable<any>, ctx: SchemaOrgGraph, fallbackResolver?: SchemaOrgNodeDefinition<any>, options: ResolverOptions = {}) {
  if (!input)
    return input

  const ids = asArray(input).map((a) => {
    const keys = Object.keys(a).length
    // filter out id references
    if ((keys === 1 && a['@id']) || (keys === 2 && a['@id'] && a['@type'])) {
      return resolveNodeId({
        // we drop @type
        '@id': ctx.find(a['@id'])?.['@id'] || a['@id'],
      }, ctx)
    }

    let resolver = fallbackResolver
    // remove resolver if the user is using define functions nested
    if (a._resolver) {
      resolver = a._resolver
      if (typeof resolver === 'string')
        resolver = loadResolver(resolver)!
      delete a._resolver
    }

    // no resolver, resolve as is
    if (!resolver)
      return a

    let node = resolveNode(a, ctx, resolver)
    if (options.afterResolve)
      options.afterResolve(node)

    // root nodes need ids
    if (options.generateId || options.root)
      node = resolveNodeId(node, ctx, resolver, false)

    if (options.root) {
      if (resolver.resolveRootNode)
        resolver.resolveRootNode(node, ctx)
      ctx.push(node)
      return idReference(node['@id'])
    }

    return node
  })

  // avoid arrays for single entries
  if (!options.array && ids.length === 1)
    return ids[0]

  return ids
}
