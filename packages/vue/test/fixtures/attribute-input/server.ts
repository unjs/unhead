import type { HtmlTagDescriptor } from 'unhead/vite'
import type { FixtureRequest } from './app'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { htmlTagsToHead } from 'unhead/vite'
import { createFixtureApp, requestHooks } from './app'

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

export const descriptors = freeze<HtmlTagDescriptor[]>([
  { tag: 'base', attrs: { href: 'https://default.test/', target: '_self' } },
  { tag: 'link', attrs: { id: 'fixture-stylesheet', rel: 'stylesheet', href: '/assets/fixture.css' }, injectTo: 'head' },
  { tag: 'meta', attrs: { name: 'description', content: 'Default & descriptor' }, injectTo: 'head' },
  {
    tag: 'script',
    attrs: {
      id: 'fixture-module',
      type: 'module',
      src: '/assets/entry.js?first=1&literal=&amp;',
      nonce: 'replace-me',
      tagPosition: 'literal-position',
      tagPriority: 'literal-priority',
      class: 'first  second',
      style: '--url: url(https://example.test/a;b);  color: red',
    },
    injectTo: 'head',
  },
  {
    tag: 'link',
    attrs: { id: 'fixture-preload', rel: 'modulepreload', href: '/assets/entry.js?first=1&literal=&amp;', crossorigin: true },
    injectTo: 'head',
  },
  { tag: 'script', attrs: { id: 'body-open', type: 'application/json' }, children: '{}', injectTo: 'body-prepend' },
  { tag: 'script', attrs: { id: 'body-close', type: 'application/json' }, children: '{}', injectTo: 'body' },
])

export const sharedInput = freeze(htmlTagsToHead(descriptors))

export async function renderFixture(request: FixtureRequest, observe?: (props: Record<string, unknown>) => void) {
  const head = createHead({ disableDefaults: true, init: [sharedInput], hooks: requestHooks(request, observe) })
  const app = createFixtureApp()
  app.use(head)
  const content = await renderToString(app)
  const rendered = renderSSRHead(head)
  const payload = JSON.stringify({ request, input: sharedInput }).replace(/</g, '\\u003c')
  return `<!DOCTYPE html><html${rendered.htmlAttrs}><head>${rendered.headTags}</head><body${rendered.bodyAttrs}>${rendered.bodyTagsOpen}<div id="app">${content}</div>${rendered.bodyTags}<script id="fixture-payload" type="application/json">${payload}</script></body></html>`
}
