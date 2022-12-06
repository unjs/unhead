---
title: createHead
description: How to create your Unhead instance.
---

**Type:**

```ts
export function createHead<T extends {} = Head>
    (options: CreateHeadOptions = {}) : Unhead
```

The `createHead` function is used to create an instance of Unhead.

## Example

```ts
import { createHead } from 'unhead'

createHead()
```

## Types

  ```ts
  export interface Unhead<Input extends {} = Head> {
    /**
     * The active head entries.
     */
    headEntries: () => HeadEntry<Input>[]
    /**
     * Create a new head entry.
     */
    push: (entry: Input, options?: HeadEntryOptions) => ActiveHeadEntry<Input>
    /**
     * Resolve tags from head entries.
     */
    resolveTags: () => Promise<HeadTag[]>
    /**
     * Exposed hooks for easier extension.
     */
    hooks: Hookable<HeadHooks>
    /**
     * Resolved options
     */
    resolvedOptions: CreateHeadOptions
    /**
     * @internal
     */
    _popSideEffectQueue: () => SideEffectsRecord
  }
  ```
