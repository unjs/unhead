import { describe, expect, it } from 'vitest'
import { MinifyPlugin } from '../../../src/plugins'
import { createServerHeadWithContext } from '../../util'

describe('minifyPlugin', () => {
  it('minifies inline script content', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    head.push({
      script: [{
        innerHTML: `
          // This is a comment
          function init() {
            console.log("hello world")
          }
          init()
        `,
      }],
    })

    const { headTags } = head.render()
    expect(headTags).not.toContain('// This is a comment')
    expect(headTags).toContain('console.log("hello world")')
    expect(headTags).toContain('init()')
  })

  it('minifies inline style content', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    head.push({
      style: [{
        innerHTML: `
          body {
            /* reset styles */
            margin: 0;
            padding: 0;
          }
        `,
      }],
    })

    const { headTags } = head.render()
    expect(headTags).not.toContain('/* reset styles */')
    expect(headTags).toContain('body{margin:0;padding:0}')
  })

  it('minifies JSON-LD scripts', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    head.push({
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': 'Example Inc',
        }, null, 2),
      }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('{"@context":"https://schema.org","@type":"Organization","name":"Example Inc"}')
  })

  it.each([
    ['speculationrules', { prerender: [{ where: { href_matches: '/*' } }] }],
    ['importmap', { imports: { lodash: '/lodash.js' } }],
  ] as const)('minifies %s scripts as JSON', (type, value) => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    const json = JSON.stringify(value, null, 2)
    head.push({
      script: type === 'speculationrules'
        ? [{ type: 'speculationrules', innerHTML: json }]
        : [{ type: 'importmap', innerHTML: json }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain(JSON.stringify(value))
    expect(headTags).not.toContain(json)
  })

  it('skips content shorter than threshold', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    head.push({
      script: [{
        innerHTML: 'var x = 1;',
      }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('var x = 1;')
  })

  it('respects js: false option', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin({ js: false })],
    })
    head.push({
      script: [{
        innerHTML: `
          // This comment should stay
          function init() { return true }
        `,
      }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('// This comment should stay')
  })

  it('respects css: false option', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin({ css: false })],
    })
    head.push({
      style: [{
        innerHTML: `
          body {
            /* this comment should stay */
            margin: 0;
          }
        `,
      }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('/* this comment should stay */')
  })

  it('respects json: false option', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin({ json: false })],
    })
    const prettyJson = JSON.stringify({ name: 'test' }, null, 2)
    head.push({
      script: [{
        type: 'application/ld+json',
        innerHTML: prettyJson,
      }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain(prettyJson)
  })

  it('accepts custom minifier functions', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin({
        js: code => `minified:${code.length}`,
        css: code => `minified:${code.length}`,
      })],
    })
    head.push({
      script: [{ innerHTML: 'function helloWorld() { return true; }; helloWorld()' }],
      style: [{ innerHTML: 'body { margin: 0; padding: 0; color: red }' }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('minified:52')
    expect(headTags).toContain('minified:42')
  })

  it('does not increase content length', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    // already minified content (>20 chars to pass internal threshold)
    head.push({
      script: [{ innerHTML: 'function a(){return 1}a();void 0' }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('function a(){return 1}a();void 0')
  })

  it('omitLineBreaks drops inter-tag separators surgically', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin({ js: false, css: false, json: false, omitLineBreaks: true })],
    })
    head.push({
      script: [
        { innerHTML: 'const a = 1;\nconst b = 2;' },
        // disabled content minifiers preserve internal newlines, proving this
        // is a renderer-level join change and not a blanket strip
        { type: 'speculationrules', innerHTML: '{\n  "prerender": []\n}' },
        { type: 'importmap', innerHTML: '{\n  "imports": {}\n}' },
        { innerHTML: 'a =\n1' }, // under the 20-char minify threshold
      ],
      meta: [{ name: 'a', content: '1' }],
    })

    const { headTags } = head.render()
    // no separators between tags
    expect(headTags).not.toContain('>\n<')
    // un-minified content keeps its internal newlines
    expect(headTags).toContain('{\n  "prerender": []\n}')
    expect(headTags).toContain('{\n  "imports": {}\n}')
    expect(headTags).toContain('a =\n1')
  })
})
