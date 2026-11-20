import { describe, expect, it } from 'vitest'
import { transformHtmlTemplate, transformHtmlTemplateRaw } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe.each([
  ['extracting', transformHtmlTemplate],
  ['raw', transformHtmlTemplateRaw],
] as const)('%s template boundaries', (_, render) => {
  it('requires a document body end outside foreign content', async () => {
    const state = { style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' as const }] }
    const prefix = '<html><head></head><body>'
    const illustration = '<svg><g>Label</body></g></svg>'
    const html = `${prefix}${illustration}</html>`
    const head = createServerHeadWithContext()
    head.push(state)
    expect(await render(head, html)).toBe(html)

    const withBodyEnd = createServerHeadWithContext()
    withBodyEnd.push(state)
    expect(await render(withBodyEnd, `${prefix}<svg></svg></body></html>`)).toBe(
      `${prefix}<svg></svg><style>p { color: black }</style></body></html>`,
    )
  })

  it('preserves a comment and RCDATA while inserting document tags', async () => {
    const head = createServerHeadWithContext()
    head.push({ title: 'Document title', style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })

    const comment = '<!-- Example: </head> -->'
    const textarea = '<textarea>Example: </body></textarea>'
    const prefix = `<html><head>${comment}`

    expect(await render(head, `${prefix}</HeAd ><body>${textarea}</BoDy ></html>`)).toBe(
      `${prefix}<title>Document title</title></HeAd ><body>${textarea}<style>p { color: black }</style></BoDy ></html>`,
    )
  })

  it('updates the document body when an earlier comment mentions a body tag', async () => {
    const head = createServerHeadWithContext()
    head.push({ title: 'Document title', bodyAttrs: { class: 'managed' } })

    const note = '<!-- Example: <body> -->'
    const output = await render(head, `<html><head>${note}</head><body data-label="a > b"><p>Content</p></body></html>`)

    expect(output).toContain(`${note}<title>Document title</title></head>`)
    expect(output).toMatch(/<body(?: [\w-]+="[^"]*")*>\s*<p>Content<\/p><\/body>/)
    expect(output).toContain('class="managed"')
  })
})

it('keeps the parsed attributes of an extracted data script', async () => {
  const head = createServerHeadWithContext()
  const html = '<html><head><script data-label="A &amp;amp; B" type=application/json/>{"label":"example"}</script></head><body></body></html>'

  expect(await transformHtmlTemplate(head, html)).toContain('<script data-label="A &amp;amp; B" type="application/json/">{"label":"example"}</script>')
})

it('preserves a literal script type during extraction', async () => {
  const head = createServerHeadWithContext()
  const html = '<html><head><script type="true">"sample"</script></head><body></body></html>'

  expect(await transformHtmlTemplate(head, html)).toContain('<script type="true">"sample"</script>')
})

it('preserves literal script attributes and a non-ASCII HTML attribute name', async () => {
  const head = createServerHeadWithContext()
  const html = '<html><head><script language="true">"sample"</script></head><body marK="label"></body></html>'

  const output = await transformHtmlTemplate(head, html)
  expect(output).toContain('<script language="true">"sample"</script>')
  expect(output).toContain('<body marK="label">')
})

it('keeps a source data script in place when its closing depends on script-data transitions', async () => {
  const head = createServerHeadWithContext()
  head.push({ title: 'Document title' })
  const script = '<script type="text/plain"><!-- <script></script> sample</script>'

  expect(await transformHtmlTemplate(head, `<html><head>${script}</head><body>Content</body></html>`)).toBe(
    `<html><head>${script}<title>Document title</title></head><body>Content</body></html>`,
  )
})
