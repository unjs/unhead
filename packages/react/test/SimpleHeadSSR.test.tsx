// @vitest-environment node
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createHead, UnheadProvider } from '../src/client'
import { renderSSRHead, transformHtmlTemplate } from '../src/server'
import { SimpleHead } from './fixtures/SimpleHead'

describe('simpleHead component in ssr', () => {
  it('renders default head tags correctly', async () => {
    const head = createHead()

    renderToString(
      <UnheadProvider head={head}>
        <SimpleHead />
      </UnheadProvider>,
    )

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`
      "<meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Default Title 2</title>
      <script async src="https://example.com/async-script.js"></script>
      <script noModule src="https://example.com/nomodule.js"></script>
      <link rel="stylesheet" href="default-styles.css">
      <style>body { background-color: #f0f0f0; }</style>
      <link rel="preload" href="https://example.com/font.woff2" as="font" type="font/woff2">
      <script defer src="https://example.com/defer-script.js"></script>
      <link rel="dns-prefetch" href="//example.com">
      <link rel="prefetch" href="https://example.com/next-page">
      <link rel="prerender" href="https://example.com/next-page">
      <meta name="description" content="Default Description">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
      <link rel="icon" href="favicon.ico">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Example","url":"https://www.example.com"}</script>
      <script type="module" src="https://example.com/module.js"></script>"
    `)
  })
  it('renders head tags correctly with SSR', async () => {
    const head = createHead()
    const html = renderToString(
      <html>
        <head></head>
        <body>
          <UnheadProvider head={head}>
            <SimpleHead />
          </UnheadProvider>
        </body>
      </html>,
    )

    const transformed = await transformHtmlTemplate(head, html)

    const headContent = transformed.match(/<head>(.*?)<\/head>/s)?.[1] || ''
    expect(headContent).toMatchInlineSnapshot(`
      "<meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Default Title 2</title>
      <script async src="https://example.com/async-script.js"></script>
      <script noModule src="https://example.com/nomodule.js"></script>
      <link rel="stylesheet" href="default-styles.css">
      <style>body { background-color: #f0f0f0; }</style>
      <link rel="preload" href="https://example.com/font.woff2" as="font" type="font/woff2">
      <script defer src="https://example.com/defer-script.js"></script>
      <link rel="dns-prefetch" href="//example.com">
      <link rel="prefetch" href="https://example.com/next-page">
      <link rel="prerender" href="https://example.com/next-page">
      <meta name="description" content="Default Description">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
      <link rel="icon" href="favicon.ico">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Example","url":"https://www.example.com"}</script>
      <script type="module" src="https://example.com/module.js"></script>"
    `)
  })
})
