import { createHead, renderHeadToString } from '../src'

describe('dedupe', () => {
  it('dedupes desc', async () => {
    const head = createHead()
    head.addEntry({
      meta: [
        {
          name: 'something-else',
          content: 'test',
        },
        {
          name: 'description',
          content: 'desc',
        },
      ],
    },
    )
    head.addEntry({
      meta: [
        {
          name: 'description',
          content: 'desc 2',
        },
      ],
    },
    )
    const { headTags } = await renderHeadToString(head)
    expect(
      headTags.includes('<meta name="description" content="desc 2">'),
    ).toBeTruthy()
    expect(headTags.split('description').length === 2).toBeTruthy()
  })

  it('dedupes key', async () => {
    const head = createHead()
    head.addEntry({
      meta: [
        {
          myCustomMeta: 'first',
          key: 'custom',
        },
        {
          myCustomMeta: 'second',
          key: 'custom',
        },
      ],
    },
    )
    const { headTags } = await renderHeadToString(head)
    expect(headTags.startsWith('<meta myCustomMeta="second">')).toBeTruthy()
    expect(headTags.split('myCustomMeta').length === 2).toBeTruthy()
  })

  test('dedupes canonical', async () => {
    const head = createHead()
    head.addEntry({
      link: [
        {
          rel: 'canonical',
          href: 'https://website.com',
        },
        {
          rel: 'canonical',
          href: 'https://website.com/new',
        },
      ],
    },
    )
    const { headTags } = await renderHeadToString(head)
    expect(
      headTags.startsWith(
        '<link rel="canonical" href="https://website.com/new">',
      ),
    ).toBeTruthy()
    expect(headTags.split('canonical').length === 2).toBeTruthy()
  })

  test('dedupes charset', async () => {
    const head = createHead()
    head.addEntry(
      {
        meta: [
          {
            charset: 'utf-8-overridden',
          },
          {
            charset: 'utf-8-two',
          },
        ],
      },
    )
    head.addEntry({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags.startsWith('<meta charset="utf-8">')).toBeTruthy()
    expect(headTags.split('charset').length === 2).toBeTruthy()
  })

  test('dedupes base', async () => {
    const head = createHead()
    head.addEntry({
      base: {
        href: '/old',
        target: '_blank',
      },
    })
    head.addEntry({
      base: {
        href: '/',
      },
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags.split('base').length === 2).toBeTruthy()
    expect(headTags.startsWith('<base href="/">')).toBeTruthy()
  })

  test('dedupes http-equiv', async () => {
    const head = createHead()
    head.addEntry({
      meta: [
        {
          'http-equiv': 'content-security-policy',
          'content': 'default-src https',
        },
      ],
    })
    head.addEntry({
      meta: [
        {
          'http-equiv': 'content-security-policy',
          'content':
              'default-src https: \'unsafe-eval\' \'unsafe-inline\'; object-src \'none\'',
        },
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags.split('http-equiv').length === 2).toBeTruthy()
  })

  test('issue #104', async () => {
    const head = createHead()
    head.addEntry({
      link: [
        { rel: 'icon', href: '/favicon.ico' }, // <-- this and,
        { rel: 'canonical', href: 'https://mydomain.me' }, // <-- this. Please reverse the order to be sure.
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<link rel=\\"icon\\" href=\\"/favicon.ico\\"><link rel=\\"canonical\\" href=\\"https://mydomain.me\\"><meta name=\\"head:count\\" content=\\"2\\">"',
    )
  })

  test('doesn\'t dedupe over tag types', async () => {
    const head = createHead()
    head.addEntry({
      meta: [
        {
          key: 'icon',
          name: 'description',
          content: 'test',
        },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico', key: 'icon' }],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<meta name=\\"description\\" content=\\"test\\"><link rel=\\"icon\\" href=\\"/favicon.ico\\"><meta name=\\"head:count\\" content=\\"2\\">"',
    )
  })

  test('dedupes legacy', async () => {
    const head = createHead()
    head.addEntry({
      meta: [
        {
          'unknown-key': 'description',
          'vmid': 'desc-1',
          'content': 'test',
        },
      ],
    })
    head.addEntry({
      meta: [
        {
          'unknown-key': 'description',
          'vmid': 'desc-2',
          'content': 'test 2',
        },
      ],
    })
    const { headTags } = await renderHeadToString(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<meta unknown-key=\\"description\\" content=\\"test\\"><meta unknown-key=\\"description\\" content=\\"test 2\\"><meta name=\\"head:count\\" content=\\"2\\">"',
    )
  })
})
