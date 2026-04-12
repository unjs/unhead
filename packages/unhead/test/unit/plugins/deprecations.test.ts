import { describe, expect, it } from 'vitest'
import { DeprecationsPlugin } from '../../../src/legacy'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('deprecationsPlugin', () => {
  it('maps v1/v2 tag props to v3 equivalents', async () => {
    const head = createServerHeadWithContext({ plugins: [DeprecationsPlugin] })
    head.push({
      script: [
        // @ts-expect-error legacy v2 prop
        { children: 'console.log(1)', hid: 'analytics' },
      ],
      meta: [
        // @ts-expect-error legacy v2 prop
        { name: 'description', content: 'a', vmid: 'desc' },
      ],
      noscript: [
        // @ts-expect-error legacy v2 prop
        { textContent: 'fallback', body: true, renderPriority: 5 },
      ],
    })

    const { headTags, bodyTags } = await renderSSRHead(head)

    expect(headTags).toContain('<script>console.log(1)</script>')
    expect(headTags).toContain('<meta name="description" content="a">')
    expect(bodyTags).toContain('<noscript')
    expect(headTags).not.toMatch(/hid=|vmid=|body=|renderPriority=/)
  })

  it('strips body prop without moving tag when body is falsy', async () => {
    const head = createServerHeadWithContext({ plugins: [DeprecationsPlugin] })
    head.push({
      script: [
        // @ts-expect-error legacy v2 prop
        { src: '/keep-in-head.js', body: false },
      ],
    })

    const { headTags, bodyTags } = await renderSSRHead(head)

    expect(headTags).toContain('<script src="/keep-in-head.js"></script>')
    expect(headTags).not.toContain('body="false"')
    expect(bodyTags).not.toContain('keep-in-head.js')
  })

  it('dedupes tags by hid across separate entries', async () => {
    const head = createServerHeadWithContext({ plugins: [DeprecationsPlugin] })
    head.push({
      meta: [
        // @ts-expect-error legacy v2 prop
        { name: 'description', content: 'first', hid: 'desc' },
      ],
    })
    head.push({
      meta: [
        // @ts-expect-error legacy v2 prop
        { name: 'description', content: 'second', hid: 'desc' },
      ],
    })

    const { headTags } = await renderSSRHead(head)

    expect(headTags).toContain('content="second"')
    expect(headTags).not.toContain('content="first"')
  })
})
