import type { LazyAppName } from './lazy-app'
import { createComponent } from 'solid-js'
import { generateHydrationScript, renderToString } from 'solid-js/web'
import { createHead, renderSSRHead, UnheadContext } from '../../src/server'
import { createFixture } from './lazy-app'

// Loads through a Vite SSR server, so `solid-js` resolves to its server build here
export function renderApp(name: LazyAppName) {
  const head = createHead({ disableDefaults: true })
  const App = createFixture().apps[name]
  const html = renderToString(() => createComponent(UnheadContext.Provider, {
    value: head,
    get children() {
      return createComponent(App, {})
    },
  }))
  return { html, headTags: renderSSRHead(head).headTags, hydrationScript: generateHydrationScript() }
}
