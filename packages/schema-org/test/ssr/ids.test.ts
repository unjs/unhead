import { defineEvent, defineMusicGroup, defineOrganization, definePerson, defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead } from 'unhead/server'
import { resolveTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'
import { injectSchemaOrg, useSetup } from '..'

describe('schema.org ssr ids', () => {
  it.each([false, true])('scopes automatic relation ids to each page (canonical: %s)', async (canonical) => {
    for (const page of ['a', 'b']) {
      const path = `/events/${page}`
      const idUrl = `https://example.com${canonical ? `/canonical/${page}` : path}`
      await useSetup((head) => {
        useSchemaOrg(head, [
          defineEvent({
            name: `Event ${page}`,
            organizer: { name: `Organizer ${page}` },
            performer: [
              definePerson({ name: `Singer ${page}` }),
              defineMusicGroup({ name: `Band ${page}` }),
              definePerson({ name: `Guest ${page}` }),
            ],
            image: `https://example.com/${page}.jpg`,
          }),
        ])

        const graph = injectSchemaOrg(head)
        expect(graph.find(node => node.name === `Event ${page}`)).toMatchObject({
          organizer: { '@id': `${idUrl}#/schema/organization/1` },
          performer: [
            { '@id': `${idUrl}#/schema/person/1` },
            { '@id': `${idUrl}#/schema/music-group/1` },
            { '@id': `${idUrl}#/schema/person/2` },
          ],
          image: { '@id': `${idUrl}#/schema/image/1` },
        })
        expect(graph).toEqual(expect.arrayContaining([
          expect.objectContaining({ '@id': `${idUrl}#/schema/organization/1`, 'name': `Organizer ${page}` }),
          expect.objectContaining({ '@id': `${idUrl}#/schema/person/1`, 'name': `Singer ${page}` }),
          expect.objectContaining({ '@id': `${idUrl}#/schema/music-group/1`, 'name': `Band ${page}` }),
          expect.objectContaining({ '@id': `${idUrl}#/schema/person/2`, 'name': `Guest ${page}` }),
          expect.objectContaining({ '@id': `${idUrl}#/schema/image/1`, 'contentUrl': `https://example.com/${page}.jpg` }),
        ]))
      }, { host: 'https://example.com', path, ...(canonical ? { url: idUrl } : {}) })
    }
  })

  it.each([
    ['https://other.example/#organizer', 'https://other.example/#organizer'],
    ['#/schema/organization/shared', 'https://example.com#/schema/organization/shared'],
    ['/shared#organizer', 'https://example.com/shared#organizer'],
    ['shared', 'https://example.com#/schema/organization/shared'],
  ])('preserves explicit organization id %s across pages', async (input, expected) => {
    for (const path of ['/events/a', '/events/b']) {
      await useSetup((head) => {
        useSchemaOrg(head, [
          defineOrganization({ name: 'Site identity' }),
          defineEvent({
            name: 'Event',
            organizer: { '@id': input, 'name': 'Organizer' },
          }),
        ])
        const graph = injectSchemaOrg(head)
        expect(graph.find(node => node.name === 'Site identity')).toMatchObject({ '@id': 'https://example.com#identity' })
        expect(graph.find(node => node.name === 'Organizer')).toMatchObject({ '@id': expected })
        expect(graph.find(node => node.name === 'Event')).toMatchObject({ organizer: { '@id': expected } })
      }, { host: 'https://example.com', path })
    }
  })

  it('adds host prefix to custom id without host', async () => {
    const ssrHead = createHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        '@id': '#foo',
        'name': 'foo',
      }),
    ])

    const tags = resolveTags(ssrHead)
    const id = JSON.parse(tags[0].innerHTML!)['@graph'][0]['@id']
    expect(id).toMatchInlineSnapshot(`"https://example.com#/schema/web-page/#foo"`)
  })
  it('allows ids with custom domains', async () => {
    const ssrHead = createHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        '@id': 'https://custom-domain.com/#foo',
        'name': 'foo',
      }),
    ])

    const tags = resolveTags(ssrHead)
    const id = JSON.parse(tags[0].innerHTML!)['@graph'][0]['@id']
    expect(id).toMatchInlineSnapshot('"https://custom-domain.com/#foo"')
  })
  it('full relative paths', async () => {
    const ssrHead = createHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        '@id': '/fr#website',
        'name': 'foo',
      }),
    ])

    const tags = resolveTags(ssrHead)
    const id = JSON.parse(tags[0].innerHTML!)['@graph'][0]['@id']
    expect(id).toMatchInlineSnapshot(`"https://example.com/fr#website"`)
  })

  it('full relative paths relations', async () => {
    const ssrHead = createHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebSite({
        '@id': '/en#website',
        'name': 'foo',
        'workTranslation': [
          { '@type': 'WebSite', '@id': '/es#website' },
          { '@type': 'WebSite', '@id': '/fr#website' },
        ],
      }),
      defineWebPage(),
    ])

    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'merge?',
      }),
    ])

    useSchemaOrg(ssrHead, [
      defineWebPage({
        potentialAction: {
          '@type': 'ViewAction',
          'target': ['https://example.com'],
        },
      }),
    ], {
      tagDuplicateStrategy: 'replace',
      tagPosition: 'bodyOpen',
    })

    const tags = resolveTags(ssrHead)
    const graph = JSON.parse(tags[0]!.innerHTML!)?.['@graph']
    expect(graph).toMatchInlineSnapshot(`
      [
        {
          "@id": "https://example.com/en#website",
          "@type": "WebSite",
          "name": "foo",
          "url": "https://example.com",
          "workTranslation": [
            {
              "@id": "https://example.com/es#website",
            },
            {
              "@id": "https://example.com/fr#website",
            },
          ],
        },
        {
          "@id": "https://example.com#webpage",
          "@type": "WebPage",
          "isPartOf": {
            "@id": "https://example.com/en#website",
          },
          "potentialAction": {
            "@type": "ViewAction",
            "target": [
              "https://example.com",
            ],
          },
          "url": "https://example.com",
        },
      ]
    `)
  })
})
