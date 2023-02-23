---
title: hooks
description: Access the hooks of Unhead.
---

# hooks

**Type:**

```ts
(entry: Input, options?: HeadEntryOptions) => ActiveHeadEntry<Input>
```

Can be used to register and call the hooks of Unhead. Powered by Hookable.

Hooks are used for all core functionality within Unhead. 

## Example

```ts
import { createHead } from 'unhead'

const head = createHead()

// trigger DOM rendering
head.callHook('entries:updated')
```
