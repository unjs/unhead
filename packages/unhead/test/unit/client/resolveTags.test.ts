import { ssrRenderTags } from 'unhead/server'
import { resolveTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'
import { basicSchema, createClientHeadWithContext } from '../../util'

describe('resolveTags', () => {
  it('preserves numeric zero meta content and drops empty values', () => {
    const head = createClientHeadWithContext()

    head.push({
      meta: [
        { name: 'numeric-zero', content: 0 },
        { name: 'string-zero', content: '0' },
        { name: 'value', content: 'value' },
        { name: 'empty-string', content: '' },
        { name: 'null', content: null },
        // @ts-expect-error missing content exercises the runtime sanitizer boundary
        { name: 'absent' },
        { name: 'false', content: false },
        { name: 'nan', content: Number.NaN },
        { name: 'positive-infinity', content: Number.POSITIVE_INFINITY },
        { name: 'negative-infinity', content: Number.NEGATIVE_INFINITY },
      ],
    })

    expect(resolveTags(head).map(tag => tag.attrs)).toEqual([
      { name: 'numeric-zero', content: 0 },
      { name: 'string-zero', content: '0' },
      { name: 'value', content: 'value' },
    ])
  })

  it('docs example', async () => {
    const head = createClientHeadWithContext()

    head.push({
      title: 'My title',
      meta: [
        {
          name: 'description',
          content: 'My description',
        },
      ],
    })

    expect(ssrRenderTags(resolveTags(head))).toEqual({
      headTags: '<title>My title</title>\n<meta name="description" content="My description">',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: '',
      bodyAttrs: '',
    })
  })
  it('basic resolve tags', async () => {
    const head = createClientHeadWithContext()

    head.push(basicSchema)

    const tags = resolveTags(head)
    expect(tags.length).toBe(5)
    expect(ssrRenderTags(tags)).toEqual({
      headTags: '<script src="https://cdn.example.com/script.js"></script>\n<meta charset="utf-8">\n<link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico">',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: ' lang="en" dir="ltr"',
      bodyAttrs: ' class="dark"',
    })
  })

  it('basic /w removal', async () => {
    const head = createClientHeadWithContext()

    const firstEntry = head.push(basicSchema)

    head.push({
      script: [
        {
          src: 'https://cdn.example.com/script2.js',
        },
      ],
    })

    await firstEntry.dispose()

    const tags = resolveTags(head)
    expect(tags.length).toBe(1)
    expect(ssrRenderTags(tags)).toEqual({
      headTags: '<script src="https://cdn.example.com/script2.js"></script>',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: '',
      bodyAttrs: '',
    })
  })

  it('basic /w update', async () => {
    const head = createClientHeadWithContext()

    const firstEntry = head.push(basicSchema)

    await firstEntry.patch({
      ...basicSchema,
      script: [
        {
          src: 'https://cdn.example.com/script2.js',
        },
      ],
    })

    const tags = resolveTags(head)
    expect(tags.length).toBe(5)
    expect(ssrRenderTags(tags)).toEqual({
      headTags: '<script src="https://cdn.example.com/script2.js"></script>\n<meta charset="utf-8">\n<link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico">',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: ' lang="en" dir="ltr"',
      bodyAttrs: ' class="dark"',
    })
  })

  it('class array merge support', async () => {
    const head = createClientHeadWithContext()

    head.push({
      htmlAttrs: {
        class: ['foo', 'bar'],
      },
      bodyAttrs: {
        class: ['foo2', 'bar2'],
      },
    })

    head.push({
      htmlAttrs: {
        class: ['something-new'],
      },
      bodyAttrs: {
        class: 'something-new2',
      },
    })

    const tags = resolveTags(head)
    expect(ssrRenderTags(tags)).toEqual({
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: ' class="foo bar something-new"',
      bodyAttrs: ' class="foo2 bar2 something-new2"',
    })
  })

  it('class object merge support', async () => {
    const head = createClientHeadWithContext()

    head.push({
      htmlAttrs: {
        class: {
          foo: true,
          bar: false,
        },
      },
    })

    head.push({
      htmlAttrs: {
        class: {
          bar: true,
        },
      },
    })

    const tags = resolveTags(head)
    expect(ssrRenderTags(tags)).toEqual({
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: ' class="foo bar"',
      bodyAttrs: '',
    })
  })

  it('duplicate tags', async () => {
    const head = createClientHeadWithContext()

    head.push({
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

    const tags = resolveTags(head)

    expect(ssrRenderTags(tags)).toEqual({
      headTags: '<meta name="description" content="desc 2">',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: '',
      bodyAttrs: '',
    })
  })
})
