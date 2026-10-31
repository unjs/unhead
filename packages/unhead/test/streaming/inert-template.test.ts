import type { PreparedTemplate } from 'unhead/stream/server'
import { JSDOM } from 'jsdom'
import { createHead, transformHtmlTemplate } from 'unhead/server'
import { createStreamableHead, prepareStreamingTemplate, prepareTemplate, renderSSRHeadShell, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const renderers = {
  transform: (template: string | PreparedTemplate) => transformHtmlTemplate(createHead({ disableDefaults: true }), template),
  shell: (template: string | PreparedTemplate) => renderSSRHeadShell(createStreamableHead({ disableDefaults: true }).head, template),
  prepare: (template: string | PreparedTemplate) => {
    const { shell, end } = prepareStreamingTemplate(createStreamableHead({ disableDefaults: true }).head, template)
    return shell + end
  },
  wrap: (template: string | PreparedTemplate) => new Response(wrapStream(
    createStreamableHead({ disableDefaults: true }).head,
    new ReadableStream<Uint8Array>({ start: controller => controller.close() }),
    template,
  )).text(),
}

const contents = [
  '<script id="lazy-script">globalThis.lazyRan=true</script><style id="lazy-style">body{display:none}</style>',
  '<template><script>globalThis.lazyRan=true</script><style>body{display:none}</style></template><script id="lazy-script">globalThis.lazyRan=true</script><style id="lazy-style">body{display:none}</style>',
  '<script id="lazy-script">globalThis.marker="</template>";globalThis.lazyRan=true</script><!-- </template> --><style id="lazy-style">body{display:none}</style>',
  '<textarea></template></textarea><script id="lazy-script">globalThis.lazyRan=true</script><style id="lazy-style">body{display:none}</style>',
  '<script id="lazy-script"><!--<script></script></template><script>globalThis.lazyRan=true</script>\n</script><style id="lazy-style">body{display:none}</style>',
  '<script id="lazy-script"></script data-x="></template><script>globalThis.lazyRan=true</script>"><style id="lazy-style">body{display:none}</style>',
]

describe.each(Object.entries(renderers))('%s preserves inert template contents', (_, render) => {
  it.each([false, true])('keeps scripts and styles inert, prepared: %s', async (prepared) => {
    for (const content of contents) {
      const inert = `<template id="lazy">${content}</template>`
      const source = `<html><head>${inert}<meta name="description" content="active"></head><body><!--app-html--></body></html>`
      const html = await render(prepared ? prepareTemplate(source) : source)
      const dom = new JSDOM(html, { runScripts: 'dangerously' })
      try {
        expect(dom.window.lazyRan).toBeUndefined()
        expect(dom.window.document.querySelector('#lazy-script, #lazy-style')).toBeNull()
        const template = dom.window.document.querySelector<HTMLTemplateElement>('#lazy')
        expect(template).not.toBeNull()
        expect(template!.content.querySelector('#lazy-script')).not.toBeNull()
        expect(template!.content.querySelector('#lazy-style')).not.toBeNull()
        expect(html).toContain(inert)
        expect(dom.window.document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('active')
      }
      finally {
        dom.window.close()
      }
    }
  })
})
