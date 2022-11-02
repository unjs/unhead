import { JSDOM } from 'jsdom'
import { createHead } from '../../src'

describe('hook tags resolved', () => {
  test('read tags', async () => {
    const head = createHead()

    const hookTags = new Promise((resolve) => {
      head.hooks['resolved:tags'].push((tags) => {
        resolve(tags)
      })
    })

    head.addEntry({
      title: 'test',
    })
    const dom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body></body></html>',
    )
    await head.updateDOM(dom.window.document)

    const tags = await hookTags
    expect(tags[0].tag).toEqual('title')
    expect(tags[0].children).toEqual('test')
    expect(tags).toMatchInlineSnapshot(`
      [
        {
          "children": "test",
          "options": {},
          "props": {},
          "runtime": {
            "entryId": 0,
            "position": 0,
          },
          "tag": "title",
        },
      ]
    `)
  })

  test('write tags', async () => {
    const head = createHead()

    const hookTags = new Promise((resolve) => {
      head.hooks['resolved:tags'].push((tags) => {
        for (const k in tags)
          tags[k].props.extra = true

        resolve(tags)
      })
    })

    head.addEntry({
      title: 'test',
    })
    const dom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body></body></html>',
    )
    await head.updateDOM(dom.window.document)

    const hooks = await hookTags
    expect(hooks[0].props.extra).toBeTruthy()
    expect(hooks[0]).toMatchInlineSnapshot(`
      {
        "children": "test",
        "options": {},
        "props": {
          "extra": true,
        },
        "runtime": {
          "entryId": 0,
          "position": 0,
        },
        "tag": "title",
      }
    `)
  })
})
