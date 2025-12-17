import { defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead, renderSSRHead } from 'unhead/server'

async function doHead() {
  const head = createHead()

  useHead(head, {
    title: 'Test',
  })

  // Only use WebPage and WebSite - other resolvers should be tree-shaken
  useSchemaOrg(head, [
    defineWebSite({
      name: 'Test Site',
    }),
    defineWebPage({
      name: 'Test Page',
    }),
  ])

  return await renderSSRHead(head)
}

doHead()
