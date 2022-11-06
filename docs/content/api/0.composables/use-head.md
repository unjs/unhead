---
title: useHead
---

- **Type:** `(input: Arrayable<UseSchemaOrgInput>) => void`

  Update Schema.org reactively.

  Will register input as individual nodes in the graph, handle resolving and relations.

  Note: It's recommended you use the define functions as input here as they will resolve to a `ResolvedRootNodeResolver`
  for you.

  ```ts
  import { useSchemaOrg } from '@vueuse/schema-org'

  useSchemaOrg([
    defineWebPage({ name: 'Home' })
  ])
  ```
  **UseSchemaOrgInput**

  ```ts
  export type UseSchemaOrgInput = ResolvedRootNodeResolver<any> | Thing | Record<string, any>
  
  export interface ResolvedRootNodeResolver<Input, ResolvedInput = Input> {
    resolve: (ctx: SchemaOrgContext) => ResolvedInput
    resolveAsRootNode: (ctx: SchemaOrgContext) => void
  }
  ```
