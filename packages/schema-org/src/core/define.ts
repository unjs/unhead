import type { SchemaOrgNodeDefinition, Thing } from '../types'

/* @__NO_SIDE_EFFECTS__ */
export function defineSchemaOrgResolver<T extends Thing, CastInput = T>(schema: SchemaOrgNodeDefinition<T, CastInput>) {
  return schema
}
