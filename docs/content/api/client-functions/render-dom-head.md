---
title: renderDOMHead
---

- **Type:** `(options: CreateSchemaOrgInput) => SchemaOrgClient`

  Create the Schema.org manager instance.

## Types

```ts
export interface CreateSchemaOrgInput {
  /**
   * The meta data used to render the final schema.org graph.
   */
  meta: () => MetaInput
  /**
   * Client used to write schema to the document.
   */
  updateHead: (fn: ComputedRef) => void
}
```

  **SchemaOrgClient**

  ```ts
  export interface SchemaOrgClient {
    install: (app: App) => void
    graphNodes: SchemaNode[]
    schemaRef: Ref<string>
  
    /**
     * Adds a node to the graph with the given Vue component context.
     */
    addNode: <T extends SchemaNode>(node: T, ctx: InstanceContext) => Id
    /**
     * Given a Vue component context, deleted any nodes associated with it.
     */
    removeContext: (ctx: InstanceContext) => void
    /**
     * Sets up the initial placeholder for the meta tag using useHead.
     */
    setupDOM: () => void
    /**
     * Given an Id (#identity) find the associated node. Used for resolving relations.
     */
    findNode: <T extends SchemaNode>(id: Id) => T | null
  
    /**
     * Main API to add nodes, handles resolving and relations.
     */
    addNodesAndResolveRelations(ctx: InstanceContext, nodes: Arrayable<UseSchemaOrgInput>): Set<Id>
  
    /**
     * Trigger the schemaRef to be updated.
     */
    generateSchema: () => void
    debug: ConsolaFn | ((...arg: any) => void)
  
    setupRouteContext: (vm: ComponentInternalInstance) => InstanceContext
    options: CreateSchemaOrgInput
  }
  ```
