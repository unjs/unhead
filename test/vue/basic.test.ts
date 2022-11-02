import { ref } from 'vue'
import { createHead, resolveHeadEntriesToTags } from '../src'

describe('basic', () => {
  test('removing head works', async () => {
    const head = createHead()
    head.addEntry({
      title: 'old',
      link: [
        {
          href: '/',
        },
      ],
    })

    const { remove } = head.addEntry({
      title: 'test',
    })
    remove()

    expect(head.headEntries.length).toBe(1)
    expect(head.headEntries).toMatchInlineSnapshot(`
      [
        {
          "id": 0,
          "input": {
            "link": [
              {
                "href": "/",
              },
            ],
            "title": "old",
          },
          "options": {},
          "resolved": false,
        },
      ]
    `)
  })

  test('computed getter', async () => {
    const colour = ref('yellow')
    const head = createHead()
    head.addReactiveEntry(
      () => ({
        bodyAttrs: {
          style: () => `background: ${colour.value}`,
          class: () => `bg-${colour.value}-500`,
        },
      }),
    )
    expect(head.headEntries).toMatchInlineSnapshot(`
      [
        {
          "id": 0,
          "input": {
            "bodyAttrs": {
              "class": "bg-yellow-500",
              "style": "background: yellow",
            },
          },
          "options": {},
          "resolved": true,
        },
      ]
    `)

    expect(resolveHeadEntriesToTags(head.headEntries)).toMatchInlineSnapshot(`
      [
        {
          "options": {},
          "props": {
            "class": "bg-yellow-500",
            "style": "background: yellow",
          },
          "runtime": {
            "entryId": 0,
            "position": 0,
          },
          "tag": "bodyAttrs",
        },
      ]
    `)
  })
})
