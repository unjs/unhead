import { describe, expect, it } from 'vitest'
import { useSeoMeta } from '../../../src'
import { useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom', () => {
  it('dedupes scalar Twitter metadata and preserves structured images', async () => {
    const head = useDOMHead()

    head.push({
      meta: [
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Old title' },
        { name: 'twitter:title', content: 'New title' },
        { name: 'twitter:description', content: 'Old description' },
        { name: 'twitter:description', content: 'New description' },
      ],
    })
    useSeoMeta(head, {
      twitterImage: [
        { url: '/first.png', alt: 'First image' },
        { url: '/second.png', alt: 'Second image' },
      ],
    })

    await new Promise(resolve => setTimeout(resolve, 10))
    const document = head.resolvedOptions.document!
    const contents = (name: string) =>
      [...document.querySelectorAll(`meta[name="${name}"]`)]
        .map(tag => tag.getAttribute('content'))

    expect(contents('twitter:card')).toEqual(['summary_large_image'])
    expect(contents('twitter:title')).toEqual(['New title'])
    expect(contents('twitter:description')).toEqual(['New description'])
    expect(contents('twitter:image')).toEqual(['/first.png', '/second.png'])
    expect(contents('twitter:image:alt')).toEqual(['First image', 'Second image'])
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

    // wait for auto-render
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta name="description" content="desc 2"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.dispose()

    // wait for auto-render after dispose
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
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
