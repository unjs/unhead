import { describe, expect, it } from 'vitest'
import { useSeoMeta } from '../../../src'
import { getActiveDom, useDOMHead } from '../../util'

describe('dom', () => {
  it('dedupes scalar social metadata and preserves structured images', async () => {
    const head = useDOMHead()

    head.push({
      meta: [
        { property: 'og:title', content: 'Old Open Graph title' },
        { property: 'og:title', content: 'New Open Graph title' },
        { property: 'og:description', content: 'Old Open Graph description' },
        { property: 'og:description', content: 'New Open Graph description' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Old title' },
        { name: 'twitter:title', content: 'New title' },
        { name: 'twitter:description', content: 'Old description' },
        { name: 'twitter:description', content: 'New description' },
      ],
    })
    useSeoMeta(head, {
      ogImage: [
        { url: '/first-og.png', alt: 'First Open Graph image' },
        { url: '/second-og.png', alt: 'Second Open Graph image' },
      ],
      twitterImage: [
        { url: '/first.png', alt: 'First image' },
        { url: '/second.png', alt: 'Second image' },
      ],
    })

    await new Promise(resolve => setTimeout(resolve, 10))
    const document = head.resolvedOptions.document!
    const contents = (attribute: 'name' | 'property', name: string) =>
      [...document.querySelectorAll(`meta[${attribute}="${name}"]`)]
        .map(tag => tag.getAttribute('content'))

    expect(contents('property', 'og:title')).toEqual(['New Open Graph title'])
    expect(contents('property', 'og:description')).toEqual(['New Open Graph description'])
    expect(contents('property', 'og:image')).toEqual(['/first-og.png', '/second-og.png'])
    expect(contents('property', 'og:image:alt')).toEqual(['First Open Graph image', 'Second Open Graph image'])
    expect(contents('name', 'twitter:card')).toEqual(['summary_large_image'])
    expect(contents('name', 'twitter:title')).toEqual(['New title'])
    expect(contents('name', 'twitter:description')).toEqual(['New description'])
    expect(contents('name', 'twitter:image')).toEqual(['/first.png', '/second.png'])
    expect(contents('name', 'twitter:image:alt')).toEqual(['First image', 'Second image'])
  })

  it('basic', async () => {
    const head = useDOMHead()

    const entry = head.push({
      meta: [
        {
          name: 'description',
          content: 'desc',
        },
        {
          name: 'description',
          content: 'desc 2',
        },
      ],
    })

    // Wait for the head to render (it auto-renders on entries:updated)
    await new Promise(resolve => setTimeout(resolve, 10))
    const dom = getActiveDom()!

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta name="description" content="desc 2"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.dispose()

    // Wait for the head to re-render after dispose
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
