import { JSDOM } from 'jsdom'
import { bench, describe } from 'vitest'
import { createHead, renderDOMHead } from '../packages/unhead/src/client'

// Re-render hot path: one head, ~12 tags incl htmlAttrs/bodyAttrs (with classes)
// + a bodyAttrs window event handler, forced dirty re-render each iteration.
function setup() {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div><h1>hello</h1></div></body></html>')
  const document = dom.window.document
  const head = createHead({ document })
  head.push({
    htmlAttrs: { lang: 'en', class: 'theme-dark layout-wide' },
    bodyAttrs: { class: 'page-home is-ready', onresize: () => {} },
    title: 'Page title',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'A description of the page' },
      { property: 'og:title', content: 'Page title' },
      { property: 'og:description', content: 'A description of the page' },
      { property: 'og:image', content: 'https://example.com/og.png' },
    ],
    link: [
      { rel: 'canonical', href: 'https://example.com/' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ],
    script: [
      { src: 'https://example.com/app.js', defer: true },
    ],
  })
  // initial render so subsequent renders hit the re-render (reuse) path
  renderDOMHead(head, { document })
  return { head, document }
}

describe('renderDOMHead re-render', () => {
  const { head, document } = setup()
  bench('forced dirty re-render (12 tags)', () => {
    head.dirty = true
    renderDOMHead(head, { document })
  })
})
