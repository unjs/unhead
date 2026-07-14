import type { SchemaOrgNodeDefinition, Thing } from '../types'

/* @__NO_SIDE_EFFECTS__ */
export function defineSchemaOrgResolver<T extends Thing>(schema: SchemaOrgNodeDefinition<T>) {
  return schema
}
