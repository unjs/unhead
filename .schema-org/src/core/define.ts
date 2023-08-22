import type { SchemaOrgNodeDefinition, Thing } from '../types'

export function defineSchemaOrgResolver<T extends Thing>(schema: SchemaOrgNodeDefinition<T>) {
  return schema
}
