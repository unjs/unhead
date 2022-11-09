---
title: createHead
description: How to create your unhead instance.
icon: noto:hammer
---

**Type:**

```ts
export function createHead<T extends {} = Head>
    (options: CreateHeadOptions = {}) : Unhead
```

The `createHead` function is used to create an instance of unhead.

## Example

```ts
import { createHead } from '@unhead/vue'

createHead()
```

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

  **HeadClient**

  ```ts
  export interface HeadClient<T = Head> {
    /**
     * The active head entries.
     */
    headEntries: () => HeadEntry<T>[]
    /**
     * Create a new head entry.
     */
    push: (entry: T, options?: HeadEntryOptions) => ActiveHeadEntry<T>
    /**
     * Resolve tags from head entries.
     */
    resolveTags: () => Promise<HeadTag[]>
    /**
     * Exposed hooks for easier extension.
     */
    hooks: Hookable<HeadHooks<T>>
    /**
     * @internal
     */
    _removeQueuedSideEffect: (key: string) => void
    /**
     * @internal
     */
    _flushQueuedSideEffects: () => void
  }
  ```
