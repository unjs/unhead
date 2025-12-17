import { defineQuestion, defineWebPage, useSchemaOrg } from '@unhead/schema-org'
import { renderSSRHead } from '@unhead/ssr'
import { useHead } from 'unhead'
import { createHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { useSetup } from '..'

describe('schema.org ssr xss', () => {
  it('basic', async () => {
    const ssrHead = createHead()
    useHead(ssrHead, {
      templateParams: {
        // use XSS for json script
        xssVar: '</script><script>alert(1)</script>',
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'test',
        description: '%xssVar',
        foo: '"}</script><script>alert(2)</script>',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "description": "\\u003C/script>\\u003Cscript>alert(1)\\u003C/script>",
            "foo": "\\"}\\u003C/script>\\u003Cscript>alert(2)\\u003C/script>",
            "name": "test"
          }
        ]
      }</script>"
    `)
  })

  it('question', async () => {
    const ssrHead = await useSetup((head) => {
      useSchemaOrg(head, [
        defineQuestion({
          name: 'What is the <i>meaning of life</i>?',
          acceptedAnswer: '<strong>Let me tell you!</strong>It\'s at least 42.',
        }),
      ])
    })

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "https://example.com/#/schema/question/1",
            "@type": "Question",
            "inLanguage": "en-AU",
            "name": "What is the \\u003Ci>meaning of life\\u003C/i>?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "\\u003Cstrong>Let me tell you!\\u003C/strong>It's at least 42."
            }
          }
        ]
      }</script>"
    `)
  })
})
