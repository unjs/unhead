import type { SchemaOrgNodeDefinition, Thing } from '../types'

export function defineSchemaOrgResolver<T extends Thing, CastInput = T>(schema: SchemaOrgNodeDefinition<T, CastInput>) {
  return schema
}
