---
title: Hooks
description: Access the hooks of Unhead.
---

**Type:**

```ts
(entry: Input, options?: HeadEntryOptions) => ActiveHeadEntry<Input>
```

Can be used to register and call the hooks of Unhead. Powered by Hookable.

Hooks are used for all core functionality within Unhead. 

## Examples

### Call hook

```ts
import { createHead } from 'unhead'

const head = createHead()

// trigger DOM rendering
head.hooks.callHook('entries:updated')
```

### Attach hook

```ts
import { createHead } from 'unhead'

const head = createHead({
  hooks: {
    init() { console.log('ready') }
  }
})
```

## Available hooks

### Core hooks

- `'init'`: `ctx: Unhead<any>`. 
    
- `'entries:updated'`: `ctx: Unhead<any>`. 

- `'entries:resolve'`: `ctx: EntryResolveCtx<any>`. 

- `'tag:normalise'`: `ctx: { tag: HeadTag; entry: HeadEntry<any>; resolvedOptions: CreateHeadOptions }`. 

- `'tags:beforeResolve'`: `ctx: { tags: HeadTag[] }`. 

- `'tags:resolve'`: `ctx: { tags: HeadTag[] }`. 

### DOM hooks

- `'dom:beforeRender'`: `ctx: ShouldRenderContext & { tags: DomRenderTagContext[] }`. 

- `'dom:renderTag'`: `ctx: DomRenderTagContext`, `document: Document`, and `track: any`. 

- `'dom:rendered'`: `ctx: { renders: DomRenderTagContext[] }`. 

### SSR hooks

- `'ssr:beforeRender'`: `ctx: ShouldRenderContext`. 

- `'ssr:render'`: `ctx: { tags: HeadTag[] }`. 

- `'ssr:rendered'`: `ctx: SSRRenderContext`. 
