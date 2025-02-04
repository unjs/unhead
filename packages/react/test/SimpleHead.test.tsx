import { render } from '@testing-library/react'
// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { createHead, UnheadProvider } from '../src/client'
import { renderSSRHead } from '../src/server'
import { SimpleHead } from './fixtures/SimpleHead'

describe('simpleHead component', () => {
  it('renders default head tags correctly', async () => {
    const head = createHead()

    render(
      <UnheadProvider head={head}>
        <SimpleHead />
      </UnheadProvider>,
    )

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`
      "<meta name="viewport" content="width=device-width, initial-scale=1">
      <title data-tagPriority="high">Default Title</title>
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
      <link rel="stylesheet" href="default-styles.css">
      <link rel="icon" href="favicon.ico">
      <link rel="preload" href="https://example.com/font.woff2" as="font" type="font/woff2" crossorigin="anonymous">
      <link rel="dns-prefetch" href="//example.com">
      <link rel="prefetch" href="https://example.com/next-page">
      <link rel="prerender" href="https://example.com/next-page">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Example","url":"https://www.example.com"}</script>
      <script type="module" src="https://example.com/module.js"></script>
      <script noModule src="https://example.com/nomodule.js"></script>
      <script async src="https://example.com/async-script.js"></script>
      <script defer src="https://example.com/defer-script.js"></script>
      <style>body { background-color: #f0f0f0; }</style>
      <meta name="description" content="Default Description">"
    `)
  })
  it('renders nothing if component is unmounted', async () => {
    const head = createHead()

    const { unmount } = render(
      <UnheadProvider head={head}>
        <SimpleHead />
      </UnheadProvider>,
    )

    unmount()

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toBe('')
  })
})
