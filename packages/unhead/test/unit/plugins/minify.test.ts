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

  it('skips speculationrules and importmap types', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin()],
    })
    const speculationContent = JSON.stringify({
      prerender: [{ where: { href_matches: '/*' } }],
    }, null, 2)
    head.push({
      script: [{
        type: 'speculationrules',
        innerHTML: speculationContent,
      }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain(speculationContent)
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
        threshold: 0,
      })],
    })
    head.push({
      script: [{ innerHTML: 'function helloWorld() { return true }' }],
      style: [{ innerHTML: 'body { margin: 0; padding: 0 }' }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('minified:37')
    expect(headTags).toContain('minified:30')
  })

  it('does not increase content length', () => {
    const head = createServerHeadWithContext({
      plugins: [MinifyPlugin({ threshold: 0 })],
    })
    // already minified content
    head.push({
      script: [{ innerHTML: 'function a(){return 1}a()' }],
    })

    const { headTags } = head.render()
    expect(headTags).toContain('function a(){return 1}a()')
  })
})
