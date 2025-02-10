import type {
  Arrayable,
  Id,
  MetaInput,
  ResolvedMeta,
  ResolverOptions,
  SchemaOrgGraph,
  SchemaOrgNode,
  SchemaOrgNodeDefinition,
  Thing,
} from './types'
import { hasProtocol, hasTrailingSlash, joinURL, withBase, withoutTrailingSlash, withTrailingSlash } from 'ufo'
import { SchemaOrgNodeResolverMap } from './const'

function groupBy<T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) {
  return array.reduce((acc, value, index, array) => {
    const key = predicate(value, index, array)
    if (!acc[key])
      acc[key] = []
    acc[key].push(value)
    return acc
  }, {} as { [key: string]: T[] })
}

function uniqueBy<T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) {
  // get last item
  return Object.values(groupBy(array, predicate)).map(a => a[a.length - 1])
}

function merger(object, key, value) {
  // dedupe merge arrays
  if (Array.isArray(object[key])) {
    if (Array.isArray(value)) {
      // unique set
      // make a record with hash'es as keys for [...object[key], ...value]
      const map = {} as Record<string, any>
      for (const item of [...object[key], ...value])
        map[hash(item)] = item
      // @ts-expect-error untyped
      object[key] = Object.values(map)
      if (key === 'itemListElement') {
        // @ts-expect-error untyped
        object[key] = [...uniqueBy(object[key], item => item.position)]
      }
      return true
    }
    object[key] = merge(object[key], Array.isArray(value) ? value : [value])
    return true
  }
}

export function idReference<T extends Thing>(node: T | string) {
  return {
    '@id': typeof node !== 'string' ? node['@id'] : node,
  }
}

export function resolvableDateToDate(val: Date | string) {
  try {
    const date = val instanceof Date ? val : new Date(Date.parse(val))
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }
  // not too fussed if it can't be resolved, this is on the user to validate
  catch {
  }
  return typeof val === 'string' ? val : val.toString()
}

const IS_VALID_W3C_DATE = [
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
  /^\d{4}-[01]\d-[0-3]\d$/,
  /^\d{4}-[01]\d$/,
  /^\d{4}$/,
]

export function isValidW3CDate(d: string) {
  return IS_VALID_W3C_DATE.some(r => r.test(d))
}

export function resolvableDateToIso(val: Date | string | undefined) {
  if (!val)
    return val
  try {
    if (val instanceof Date)
      return val.toISOString()
    else if (isValidW3CDate(val))
      return val
    else
      return new Date(Date.parse(val)).toISOString()
  }
  // not too fussed if it can't be resolved, this is on the user to validate
  catch {
  }
  return typeof val === 'string' ? val : val.toString()
}

export const IdentityId = '#identity'

export function setIfEmpty<T extends Thing>(node: T, field: keyof T, value: any) {
  if (!node?.[field] && value)
    node[field] = value
}

export function asArray(input: any) {
  return Array.isArray(input) ? input : [input]
}

export function dedupeMerge<T extends Thing>(node: T, field: keyof T, value: any) {
  const data = new Set(asArray(node[field]))
  data.add(value)
  // @ts-expect-error untyped key
  node[field] = [...data].filter(Boolean)
}

export function prefixId(url: string, id: Id | string) {
  // already prefixed
  if (hasProtocol(id))
    return id as Id
  if (!id.includes('#'))
    id = `#${id}`
  return withBase(id, url) as Id
}

export function trimLength(val: string | undefined, length: number) {
  if (!val)
    return val

  if (val.length > length) {
    const trimmedString = val.substring(0, length)
    return trimmedString.substring(0, Math.min(trimmedString.length, trimmedString.lastIndexOf(' ')))
  }
  return val
}

export function resolveDefaultType(node: Thing, defaultType: Arrayable<string>) {
  const val = node['@type']
  if (val === defaultType)
    return
  const types = new Set<string>([
    ...asArray(defaultType),
    ...asArray(val),
  ])
  node['@type'] = types.size === 1 ? val : [...types.values()]
}

export function resolveWithBase(base: string, urlOrPath: string) {
  // can't apply base if there's a protocol
  if (!urlOrPath || hasProtocol(urlOrPath) || ((urlOrPath[0] !== '/') && (urlOrPath[0] !== '#')))
    return urlOrPath
  return withBase(urlOrPath, base)
}

export function resolveAsGraphKey(key?: Id | string) {
  if (!key)
    return key
  return key.substring(key.lastIndexOf('#')) as Id
}

/**
 * Removes attributes which have a null or undefined value
 */
export function stripEmptyProperties(obj: any) {
  for (const k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) {
      continue
    }

    if (obj[k] && typeof obj[k] === 'object') {
      // avoid walking vue reactivity
      if (obj[k].__v_isReadonly || obj[k].__v_isRef)
        return
      stripEmptyProperties(obj[k])
      return
    }
    if (obj[k] === '' || obj[k] === null || obj[k] === undefined)
      delete obj[k]
  }

  return obj
}

/**
 * Dedupe, flatten and a collection of nodes. Will also sort node keys and remove meta keys.
 * @param nodes
 */
export function dedupeNodes(nodes: SchemaOrgNode[]) {
  // assign based on id to dedupe across context
  const dedupedNodes: Record<Id, SchemaOrgNode> = {}
  for (const key of nodes.keys()) {
    const n = nodes[key]
    const nodeKey = resolveAsGraphKey(n['@id'] || hash(n)) as Id
    if (dedupedNodes[nodeKey] && n._dedupeStrategy !== 'replace')
      dedupedNodes[nodeKey] = merge(nodes[key], dedupedNodes[nodeKey]) as SchemaOrgNode
    else
      dedupedNodes[nodeKey] = nodes[key]
  }
  return Object.values(dedupedNodes)
}

export function normalizeNodes(nodes: SchemaOrgNode[]) {
  const sortedNodeKeys = nodes.keys()

  // assign based on id to dedupe across context
  const dedupedNodes: Record<Id, SchemaOrgNode> = {}
  for (const key of sortedNodeKeys) {
    const n = nodes[key]
    const nodeKey = resolveAsGraphKey(n['@id']) as Id
    const groupedKeys = groupBy(Object.keys(n), (key) => {
      const val = n[key]
      if (key[0] === '_')
        return 'ignored'
      if (Array.isArray(val) || typeof val === 'object')
        return 'relations'
      return 'primitives'
    })

    const keys = [
      ...(groupedKeys.primitives || []).sort(),
      ...(groupedKeys.relations || []).sort(),
    ]
    const newNode = {} as SchemaOrgNode
    for (const key of keys)
      newNode[key] = n[key]
    // if (dedupedNodes[nodeKey])
    //   newNode = merge(newNode, dedupedNodes[nodeKey]) as SchemaOrgNode
    dedupedNodes[nodeKey] = newNode
  }
  return Object.values(dedupedNodes)
}

export function defineSchemaOrgResolver<T extends Thing>(schema: SchemaOrgNodeDefinition<T>) {
  return schema
}

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

  return <ResolvedMeta>{
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

export function resolveNode<T extends Thing>(node: T, ctx: SchemaOrgGraph, resolver?: SchemaOrgNodeDefinition<T>) {
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
  resolver?.inheritMeta?.forEach((entry) => {
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
    if (Array.isArray(v)) {
      v.forEach((v: any, k2: number) => {
        if (typeof v === 'object' && v?._resolver) {
          node[k][k2] = resolveRelation(v, ctx, v._resolver)
        }
      })
    }
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
  // transform 'host' to https://host.com/#schema/webpage/gj5g59gg

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

  let alias = resolver?.alias
  if (!alias) {
    const type = asArray(node['@type'])?.[0] || ''
    // kebab case type
    alias = type.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }
  const key = prefixId(ctx.meta[prefix], alias)
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
  let count = ctx.graphIds.get(key) || -1
  node['@id'] = String(++count)
  ctx.graphIds.set(key, count)
  node['@id'] = prefixId(ctx.meta[prefix], `#/schema/${alias}/${node['@id']}`)
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
      if (a._resolver in SchemaOrgNodeResolverMap) {
        resolver = SchemaOrgNodeResolverMap[a._resolver]
      }
      else {
        resolver = a._resolver
      }
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
