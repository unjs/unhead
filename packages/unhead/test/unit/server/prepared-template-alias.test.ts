import { createHead, prepareTemplate, transformHtmlTemplate } from 'unhead/server'
import { expect, it } from 'vitest'

it('renders shared prepared tags across requests with isolated overrides', () => {
  const prepared = prepareTemplate('<html><head><meta name="description" content="shared"></head><body></body></html>')
  const render = (content?: string) => {
    const head = createHead({ disableDefaults: true })
    if (content)
      head.push({ meta: [{ name: 'description', content }] })
    return transformHtmlTemplate(head, prepared)
  }

  expect(render()).toContain('<meta name="description" content="shared">')
  expect(render('request')).toContain('<meta name="description" content="request">')
  expect(render()).toContain('<meta name="description" content="shared">')
})
