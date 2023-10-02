import { describe } from 'vitest'
import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('tagDuplicateStrategy', () => {
  it('basic', async () => {
    const head = createHead()
    head.push({
      htmlAttrs: {
        'data-layout': 'base',
      },
    })
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

  it('class / style merge', async () => {
    const head = createHead()
    head.push({
      htmlAttrs: {
        class: 'html-doc',
        style: 'color: red;',
      },
    })
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
