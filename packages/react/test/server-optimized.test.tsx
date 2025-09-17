// @vitest-environment node
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Head, useHead } from '../src'
import { createHead, UnheadProvider } from '../src/client'
import { transformHtmlTemplateReact, transformHtmlTemplateReactSafe } from '../src/server-optimized'

function TestApp() {
  useHead({
    title: 'Optimized Test App',
    meta: [
      { name: 'description', content: 'Testing optimized transforms' },
      { property: 'og:title', content: 'OG Test Title' },
    ],
    link: [
      { rel: 'stylesheet', href: '/styles.css' },
    ],
  })

  return (
    <>
      <Head>
        <script src="/analytics.js" async />
        <style>{`body { margin: 0; }`}</style>
      </Head>
      <div>
        <h1>Optimized Test Application</h1>
        <p>Testing the React-specific optimized transforms.</p>
      </div>
    </>
  )
}

const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Default Title</title>
</head>
<body>
  <div id="root">{{APP_HTML}}</div>
</body>
</html>`

describe('react Server Optimized Functions', () => {
  it('should work with transformHtmlTemplateReact (no extraction)', async () => {
    const head = createHead()
    const appHtml = renderToString(
      <UnheadProvider head={head}>
        <TestApp />
      </UnheadProvider>,
    )
    const fullHtml = htmlTemplate.replace('{{APP_HTML}}', appHtml)

    const result = await transformHtmlTemplateReact(head, fullHtml)

    expect(result).toContain('Optimized Test App')
    expect(result).toContain('Testing optimized transforms')
    expect(result).toContain('OG Test Title')
    expect(result).toContain('/styles.css')
    expect(result).toContain('/analytics.js')
    expect(result).toContain('body { margin: 0; }')
    expect(result).toContain('<div id="root">')
  })

  it('should work with transformHtmlTemplateReactSafe (ultrahtml extraction)', async () => {
    const head = createHead()
    const appHtml = renderToString(
      <UnheadProvider head={head}>
        <TestApp />
      </UnheadProvider>,
    )
    const fullHtml = htmlTemplate.replace('{{APP_HTML}}', appHtml)

    const result = await transformHtmlTemplateReactSafe(head, fullHtml)

    expect(result).toContain('Optimized Test App')
    expect(result).toContain('Testing optimized transforms')
    expect(result).toContain('OG Test Title')
    expect(result).toContain('/styles.css')
    expect(result).toContain('/analytics.js')
    expect(result).toContain('body { margin: 0; }')
    expect(result).toContain('<div id="root">')
  })

  it('should preserve existing head elements with transformHtmlTemplateReactSafe', async () => {
    const complexTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="index,follow">
  <title>Existing Title</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
</head>
<body>
  <div id="root">{{APP_HTML}}</div>
</body>
</html>`

    const head = createHead()
    const appHtml = renderToString(
      <UnheadProvider head={head}>
        <TestApp />
      </UnheadProvider>,
    )
    const fullHtml = complexTemplate.replace('{{APP_HTML}}', appHtml)

    const result = await transformHtmlTemplateReactSafe(head, fullHtml)

    // Should contain React-defined content
    expect(result).toContain('Optimized Test App')
    expect(result).toContain('Testing optimized transforms')

    // Should preserve existing template elements (robots, preconnect)
    expect(result).toContain('robots')
    expect(result).toContain('fonts.googleapis.com')
    expect(result).toContain('lang="en"')
  })
})
