import { JSDOM } from 'jsdom'
import { useHeadSafe } from 'unhead'
import { createHead, renderSSRHead, transformHtmlTemplate } from 'unhead/server'
import { createStreamableHead, renderSSRHeadShell } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const template = '<!DOCTYPE html><html><head></head><body></body></html>'

describe.each(['renderSSRHead', 'render', 'template', 'stream'] as const)('policy ordering through %s', (renderer) => {
  it.each(['content-security-policy', 'Content-Security-Policy', 'CONTENT-SECURITY-POLICY'])('places %s before safe stylesheets and app scripts', (httpEquiv) => {
    const head = renderer === 'stream'
      ? createStreamableHead({ disableDefaults: true }).head
      : createHead({ disableDefaults: true })
    useHeadSafe(head, { link: [{ rel: 'stylesheet', href: '/safe.css' }] })
    head.push({ script: [{ src: '/app.js' }] })
    head.push({ meta: [{ 'http-equiv': httpEquiv, 'content': 'default-src \'none\'' }] })

    const html = renderer === 'stream'
      ? renderSSRHeadShell(head, template)
      : renderer === 'template'
        ? transformHtmlTemplate(head, template)
        : renderer === 'render'
          ? head.render().headTags
          : renderSSRHead(head).headTags

    const { document } = new JSDOM(html).window
    const policy = document.querySelector('meta[http-equiv]')!
    expect(policy?.getAttribute('content')).toBe('default-src \'none\'')
    for (const selector of ['link[rel="stylesheet"][href="/safe.css"]', 'script[src="/app.js"]']) {
      const resource = document.querySelector(selector)!
      expect(resource).not.toBeNull()
      expect(policy.compareDocumentPosition(resource) & 4).toBe(4)
    }
  })
})
