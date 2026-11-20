import type { LazyAppName } from './apps'
import { render } from 'svelte/server'
import { createHead, renderSSRHead, UnheadContextKey } from '../../../src/server'
import { apps } from './apps'

// Loads through a Vite SSR server, so Svelte compiles and resolves for the server here
export function renderApp(name: LazyAppName) {
  const head = createHead({ disableDefaults: true })
  const { body } = render(apps[name], { context: new Map([[UnheadContextKey, head]]) })
  return { html: body, headTags: renderSSRHead(head).headTags }
}
