import { renderToString } from 'solid-js/web'
import App from './App'
import { createHead, UnheadContext } from '@unhead/solid-js/server'

export function render(_url: string) {
  const unhead = createHead({
    // change default initial lang
    init: [
      {
        htmlAttrs: { lang: 'en' },
        title: 'Default title',
        titleTemplate: '%s - My Site',
      },
    ]
  })
  const html = renderToString(() => <UnheadContext.Provider value={unhead}><App /></UnheadContext.Provider>)
  return { html, unhead }
}
