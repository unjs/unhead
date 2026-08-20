import type { Identity, NodeRelation, NodeRelations, SchemaOrgNodeDefinition } from '../types'
import type { SchemaOrgGraph } from './graph'
import { asArray } from '../utils'
import { resolveRelation } from './resolve'

interface IdentityResolvers {
  organization: SchemaOrgNodeDefinition<any, any>
  person: SchemaOrgNodeDefinition<any, any>
}

export function resolveIdentityRelation(
  input: NodeRelations<Identity> | undefined,
  ctx: SchemaOrgGraph,
  resolvers: IdentityResolvers,
  options: { root?: boolean } = {},
) {
  if (!input)
    return input

  const resolveIdentity = (identity: NodeRelation<Identity>) => {
    const types = typeof identity === 'object' && identity
      ? asArray(identity['@type']).filter((type): type is string => typeof type === 'string')
      : []
    const resolver = types.length > 0 && !types.includes('Person')
      ? resolvers.organization
      : resolvers.person
    return resolveRelation(identity, ctx, resolver, options)
  }

  if (!Array.isArray(input))
    return resolveIdentity(input)
  const resolved = input.map(resolveIdentity)
  return resolved.length === 1 ? resolved[0] : resolved
}
