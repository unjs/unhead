import { describe } from 'vitest'
import { createHead } from '../../../packages/unhead/src'
import { renderSSRHead } from '../../../packages/unhead/src/runtime/server'

describe('tagDuplicateStrategy', () => {
  test('basic', async () => {
    const head = createHead()
    head.push({
      htmlAttrs: {
        'data-layout': 'base',
      },
    },
    )
    head.push({
      htmlAttrs: {
        'data-page': 'page',
        'tagDuplicateStrategy': 'merge',
      },
    })

    const { htmlAttrs } = await renderSSRHead(head)
    expect(htmlAttrs).toMatchInlineSnapshot(
      '" data-layout=\\"base\\" data-page=\\"page\\""',
    )
  })

  test('class / style merge', async () => {
    const head = createHead()
    head.push({
      htmlAttrs: {
        class: 'html-doc',
        style: 'color: red;',
      },
    },
    )
    head.push({
      htmlAttrs: {
        style: 'background: green;',
        class: 'my-specific-page',
        tagDuplicateStrategy: 'merge',
      },
    })

    const { htmlAttrs } = await renderSSRHead(head)
    expect(htmlAttrs).toMatchInlineSnapshot(
      '" class=\\"html-doc my-specific-page\\" style=\\"color: red; background: green;\\""',
    )
  })
})
