import { createHead, prepareTemplate, transformHtmlTemplateRaw } from 'unhead/server'
import { prepareStreamingTemplate } from 'unhead/stream/server'
import { bench, describe } from 'vitest'

// Realistically large template (~100KB) with many head tags, similar to a
// framework build output (modulepreload links, chunked CSS, inline data).
function buildLargeTemplate(): string {
  const headTags = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Large App</title>',
    ...Array.from({ length: 60 }, (_, i) => `<link rel="modulepreload" crossorigin href="/_assets/chunk-${i}.${i.toString(16).padStart(8, 'a')}.js">`),
    ...Array.from({ length: 20 }, (_, i) => `<link rel="stylesheet" href="/_assets/styles-${i}.css">`),
    ...Array.from({ length: 20 }, (_, i) => `<meta property="og:custom-${i}" content="Some social content value ${i}">`),
    `<style>${':root{--color:#333;}'.repeat(50)}</style>`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', 'name': 'Bench', 'keywords': Array.from({ length: 100 }, (_, i) => `keyword-${i}`) })}</script>`,
  ].join('\n    ')

  const bodyContent = Array.from({ length: 400 }, (_, i) =>
    `<section class="block-${i}"><h2>Section ${i}</h2><p>${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(3)}</p></section>`).join('\n      ')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    ${headTags}
  </head>
  <body class="antialiased">
    <div id="app"><!--app-html--></div>
    <div class="static-footer">
      ${bodyContent}
    </div>
    <script type="module" src="/_assets/entry.js"></script>
  </body>
</html>`
}

const template = buildLargeTemplate()
// eslint-disable-next-line no-console
console.log(`[prepared-template bench] template size: ${(template.length / 1024).toFixed(1)}KB`)

function makeHead() {
  const head = createHead({ disableDefaults: true })
  head.push({
    title: 'Request Title',
    htmlAttrs: { 'data-server': 'true' },
    meta: [
      { name: 'description', content: 'A per-request description' },
      { property: 'og:title', content: 'Request Title' },
    ],
    script: [{ src: '/per-request.js', tagPosition: 'bodyClose' }],
  })
  return head
}

describe('transformHtmlTemplateRaw (~100KB template)', () => {
  const prepared = prepareTemplate(template)

  bench('string per request', () => {
    transformHtmlTemplateRaw(makeHead(), template)
  })

  bench('prepared once', () => {
    transformHtmlTemplateRaw(makeHead(), prepared)
  })
})

describe('prepareStreamingTemplate (~100KB template)', () => {
  const prepared = prepareTemplate(template)
  const head = makeHead()
  const state = head.render()

  bench('string per request', () => {
    prepareStreamingTemplate(head, template, state)
  })

  bench('prepared once', () => {
    prepareStreamingTemplate(head, prepared, state)
  })
})
