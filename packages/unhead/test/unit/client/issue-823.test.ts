// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { createClientHeadWithContext } from '../../util'

// https://github.com/unjs/unhead/issues/823
describe('issue #823', () => {
  it('dedupes icon links in the DOM when prop order differs', async () => {
    const head = createClientHeadWithContext()
    useHead(head, {
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    })
    useHead(head, {
      link: [
        { href: '/favicon.png', rel: 'icon', type: 'image/png' },
        { href: '/apple-touch-icon.png', sizes: '180x180', rel: 'apple-touch-icon' },
      ],
    })
    renderDOMHead(head, { document })
    expect(document.head.querySelectorAll('link[rel="icon"]').length).toBe(1)
    expect(document.head.querySelectorAll('link[rel="apple-touch-icon"]').length).toBe(1)
  })
})
