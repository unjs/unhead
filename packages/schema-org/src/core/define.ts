import type { SchemaOrgNodeDefinition, Thing } from '../types'

const builtinSchemaNodes = new WeakSet<object>()

export function markBuiltinSchemaNode<T extends object>(node: T): T {
  builtinSchemaNodes.add(node)
  return node
}

export function isBuiltinSchemaNode(node: object): boolean {
  return builtinSchemaNodes.has(node)
}

/* @__NO_SIDE_EFFECTS__ */
export function defineSchemaOrgResolver<T extends Thing, CastInput = T>(schema: SchemaOrgNodeDefinition<T, CastInput>) {
  return schema
}
