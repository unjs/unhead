import type {
  Arrayable,
  MetaInput,
  NodeRelation,
  ResolvedMeta,
  SchemaOrgNodeDefinition,
  Thing,
} from '../types'
import type { ResolverOptions } from '../utils'
import type { SchemaOrgGraph } from './graph'
import { asArray, idReference, joinURL, prefixId, setIfEmpty, stripEmptyProperties, withoutTrailingSlash, withTrailingSlash } from '../utils'

const ALIAS_RE = /([a-z])([A-Z])/g

function nextNodeId(ctx: SchemaOrgGraph, alias: string) {
  ctx.nodeIdCounters[alias] = (ctx.nodeIdCounters[alias] || 0) + 1
  return ctx.nodeIdCounters[alias].toString()
}

export function resolveMeta(meta: Partial<MetaInput>): ResolvedMeta {
  if (!meta.path)
    meta.path = '/'

  if (!meta.host && typeof document !== 'undefined')
    meta.host = document.location.host

  if (meta.path !== '/') {
    if (meta.trailingSlash && !meta.path.endsWith('/'))
      meta.path = withTrailingSlash(meta.path)
    else if (!meta.trailingSlash && meta.path.endsWith('/'))
      meta.path = withoutTrailingSlash(meta.path)
  }

  meta.url = joinURL(meta.host || '', meta.path)

  return meta as ResolvedMeta
}

export function resolveNode<ResolvedInput extends Thing, CastInput>(node: CastInput, ctx: SchemaOrgGraph, resolver: SchemaOrgNodeDefinition<ResolvedInput, CastInput>): ResolvedInput
export function resolveNode<T extends Thing>(node: T, ctx: SchemaOrgGraph, resolver?: SchemaOrgNodeDefinition<T>): T
export function resolveNode(node: any, ctx: SchemaOrgGraph, resolver?: SchemaOrgNodeDefinition<any, any>): any {
  // allow casting from a primitive to an object
  if (resolver?.cast)
    node = resolver.cast(node, ctx)

  // handle defaults
  if (resolver?.defaults) {
    let defaults = resolver.defaults
    if (typeof defaults === 'function')
      defaults = defaults(ctx)
    node = { ...defaults, ...node }
  }

  // handle meta inherits
  const inheritMeta = resolver?.inheritMeta
  if (inheritMeta) {
    for (let i = 0; i < inheritMeta.length; i++) {
      const entry = inheritMeta[i]
      if (typeof entry === 'string')
        setIfEmpty(node, entry, ctx.meta[entry])
      else
        setIfEmpty(node, entry.key, ctx.meta[entry.meta])
    }
  }

  // handle resolve
  if (resolver?.resolve)
    node = resolver.resolve(node, ctx)

  // if user registers some resolver we haven't coded
  for (const k in node) {
    const v = node[k]
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const item = v[i]
        if (typeof item === 'object' && item?._resolver)
          node[k][i] = resolveRelation(item, ctx, item._resolver)
      }
    }
    else if (typeof v === 'object' && v?._resolver) {
      node[k] = resolveRelation(v, ctx, v._resolver)
    }
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
  // transform 'host' to https://host.com/#schema/webpage/1
  let alias = resolver?.alias
  if (!alias) {
    const type = asArray(node['@type'])?.[0] || ''
    // kebab case type
    alias = type.replace(ALIAS_RE, '$1-$2').toLowerCase()
  }

  node['@id'] = prefixId(ctx.meta[prefix], `#/schema/${alias}/${node['@id'] || nextNodeId(ctx, alias!)}`)
  return node
}

type FalsyRelationInput = '' | 0 | false | null | undefined
type RelationValue<Input> = Exclude<Input extends readonly (infer Value)[] ? Value : Input, FalsyRelationInput>
type ResolverInput<ResolvedInput extends Thing, CastInput> = CastInput | NodeRelation<ResolvedInput>
type RelationInputValue<Input> = Input extends readonly (infer Value)[] ? Value : Input
type PossibleFalsy<Input> = ('' extends Input ? '' : never)
  | (0 extends Input ? 0 : never)
  | (false extends Input ? false : never)
  | (null extends Input ? null : never)
  | (undefined extends Input ? undefined : never)
type RelationItemResult<Input, ResolvedInput> = [Exclude<Input, FalsyRelationInput>] extends [never]
  ? Input
  : NodeRelation<ResolvedInput> | PossibleFalsy<Input>
type NaturalRelationResult<Input, ResolvedInput> = Input extends readonly []
  ? []
  : Input extends readonly [infer Value]
    ? RelationItemResult<Value, ResolvedInput>
    : Input extends readonly [unknown, unknown, ...unknown[]]
      ? RelationItemResult<RelationInputValue<Input>, ResolvedInput>[]
      : Input extends readonly (infer Value)[]
        ? RelationItemResult<Value, ResolvedInput> | RelationItemResult<Value, ResolvedInput>[]
        : RelationItemResult<Input, ResolvedInput>
type ArrayRelationResult<Input, ResolvedInput> = RelationItemResult<RelationInputValue<Input>, ResolvedInput>[]
type ResolveRelationResult<Input, ResolvedInput, Options> = Input extends FalsyRelationInput
  ? Input
  : PossibleFalsy<Input>
    | (Options extends undefined
      ? NaturalRelationResult<Input, ResolvedInput>
      : 'array' extends keyof Options
        ? Options extends { array: true }
          ? ArrayRelationResult<Input, ResolvedInput>
          : Options extends { array?: false | undefined }
            ? NaturalRelationResult<Input, ResolvedInput>
            : NaturalRelationResult<Input, ResolvedInput> | ArrayRelationResult<Input, ResolvedInput>
        : NaturalRelationResult<Input, ResolvedInput>)

type ConstrainedResolverInput<ResolvedInput extends Thing, CastInput> = ResolverInput<ResolvedInput, CastInput>
  | readonly (ResolverInput<ResolvedInput, CastInput> | FalsyRelationInput)[]
  | FalsyRelationInput

export function resolveRelation<ResolvedInput extends Thing, CastInput, Input, const Options extends ResolverOptions<ResolvedInput>>(input: Input & ConstrainedResolverInput<NoInfer<ResolvedInput>, NoInfer<CastInput>>, ctx: SchemaOrgGraph, fallbackResolver: SchemaOrgNodeDefinition<ResolvedInput, CastInput>, options: Options): ResolveRelationResult<Input, ResolvedInput, Options>
export function resolveRelation<ResolvedInput extends Thing, CastInput, Input>(input: Input & ConstrainedResolverInput<NoInfer<ResolvedInput>, NoInfer<CastInput>>, ctx: SchemaOrgGraph, fallbackResolver: SchemaOrgNodeDefinition<ResolvedInput, CastInput>): ResolveRelationResult<Input, ResolvedInput, undefined>
export function resolveRelation<ResolvedInput extends Thing, CastInput, Input, const Options extends ResolverOptions<ResolvedInput>>(input: Input & ConstrainedResolverInput<NoInfer<ResolvedInput>, NoInfer<CastInput>>, ctx: SchemaOrgGraph, fallbackResolver: SchemaOrgNodeDefinition<ResolvedInput, CastInput> | undefined, options: Options): ResolveRelationResult<Input, ResolvedInput | RelationValue<Input>, Options>
export function resolveRelation<ResolvedInput extends Thing, CastInput, Input>(input: Input & ConstrainedResolverInput<NoInfer<ResolvedInput>, NoInfer<CastInput>>, ctx: SchemaOrgGraph, fallbackResolver: SchemaOrgNodeDefinition<ResolvedInput, CastInput> | undefined): ResolveRelationResult<Input, ResolvedInput | RelationValue<Input>, undefined>
export function resolveRelation<Input, const Options extends ResolverOptions>(input: Input, ctx: SchemaOrgGraph, fallbackResolver: undefined, options: Options): ResolveRelationResult<Input, RelationValue<Input>, Options>
export function resolveRelation<Input>(input: Input, ctx: SchemaOrgGraph, fallbackResolver?: undefined): ResolveRelationResult<Input, RelationValue<Input>, undefined>
export function resolveRelation(input: Arrayable<any>, ctx: SchemaOrgGraph, fallbackResolver?: SchemaOrgNodeDefinition<any>, options: ResolverOptions<any> = {}) {
  if (!input)
    return input

  const items = asArray(input)
  const ids = []

  for (let i = 0; i < items.length; i++) {
    const a = items[i]
    if (!a) {
      ids.push(a)
      continue
    }
    // Count keys without creating array
    let keyCount = 0
    for (const _ in a) keyCount++

    // filter out id references
    if ((keyCount === 1 && a['@id']) || (keyCount === 2 && a['@id'] && a['@type'])) {
      ids.push(resolveNodeId({
        '@id': ctx.find(a['@id'])?.['@id'] || a['@id'],
      }, ctx))
      continue
    }

    let resolver = fallbackResolver
    // remove resolver if the user is using define functions nested
    // Note: string resolvers should already be loaded by plugin's preloadNestedResolvers
    if (a._resolver && typeof a._resolver !== 'string') {
      resolver = a._resolver
      delete a._resolver
    }

    // no resolver, resolve as is
    if (!resolver) {
      ids.push(a)
      continue
    }

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
      ids.push(idReference(node['@id']))
      continue
    }

    ids.push(node)
  }

  // avoid arrays for single entries
  return (!options.array && ids.length === 1) ? ids[0] : ids
}
