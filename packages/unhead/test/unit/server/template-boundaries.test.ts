import { describe, expect, it } from 'vitest'
import { prepareTemplate, transformHtmlTemplate, transformHtmlTemplateRaw } from '../../../src/server'
import { prepareStreamingTemplate } from '../../../src/stream/server'
import { createServerHeadWithContext, createStreamableServerHead } from '../../util'

const renderers = [
  ['extracting', transformHtmlTemplate],
  ['raw', transformHtmlTemplateRaw],
  ['prepared', (head: ReturnType<typeof createServerHeadWithContext>, html: string) => transformHtmlTemplateRaw(head, prepareTemplate(html))],
] as const

describe.each(renderers)('%s template boundaries', (_, render) => {
  it('requires a document body end outside foreign content', () => {
    const state = { style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' as const }] }
    const prefix = '<html><head></head><body>'
    const illustration = '<svg><g>Label</body></g></svg>'
    const html = `${prefix}${illustration}</html>`
    const head = createServerHeadWithContext()
    head.push(state)
    expect(render(head, html)).toBe(html)

    const withBodyEnd = createServerHeadWithContext()
    withBodyEnd.push(state)
    expect(render(withBodyEnd, `${prefix}<svg></svg></body></html>`)).toBe(
      `${prefix}<svg></svg><style>p { color: black }</style></body></html>`,
    )
  })

  it('preserves a comment and RCDATA while inserting document tags', () => {
    const head = createServerHeadWithContext()
    head.push({ title: 'Document title', style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })

    const comment = '<!-- Example: </head> -->'
    const textarea = '<textarea>Example: </body></textarea>'
    const prefix = `<html><head>${comment}`

    expect(render(head, `${prefix}</HeAd ><body>${textarea}</BoDy ></html>`)).toBe(
      `${prefix}<title>Document title</title></HeAd ><body>${textarea}<style>p { color: black }</style></BoDy ></html>`,
    )
  })

  it('updates the complete body start tag when an attribute contains a greater-than sign', () => {
    const head = createServerHeadWithContext()
    head.push({ bodyAttrs: { class: 'managed' } })

    const output = render(head, '<html><head></head><body data-label="a > b">Content</body></html>')

    expect(output).toMatch(/<body(?: [\w-]+="[^"]*")*>Content<\/body>/)
    expect(output).toContain('class="managed"')
  })

  it('ignores a body start tag inside a comment when only head tags are rendered', () => {
    const head = createServerHeadWithContext()
    head.push({ title: 'Document title', bodyAttrs: { class: 'managed' } })

    expect(render(head, '<html><head><!-- Example: <body> --></head><body>Content</body></html>')).toBe(
      '<html><head><!-- Example: <body> --><title>Document title</title></head><body class="managed">Content</body></html>',
    )
  })

  it.each([
    '<svg><foreignObject><div>Illustration label</div></foreignObject></svg>',
    '<table><tr><td>Table cell</table>',
  ])('inserts body tags after %s', (body) => {
    const head = createServerHeadWithContext()
    head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
    const prefix = `<html><head></head><body>${body}`

    expect(render(head, `${prefix}</body></html>`)).toBe(
      `${prefix}<style>p { color: black }</style></body></html>`,
    )
  })
})

it('splits the stream at a comment in the document instead of marker text in a textarea', () => {
  const head = createStreamableServerHead()
  const textarea = '<textarea><!--app-html--></textarea>'
  const template = `<html><head></head><body>${textarea}<main><!--app-html--></main></body></html>`

  const { shell, end } = prepareStreamingTemplate(head, prepareTemplate(template))

  expect(shell).toContain(`<body>${textarea}<main>`)
  expect(end).toBe('</main></body></html>')
})

it('preserves a closing-tag example before the stream outlet', () => {
  const head = createStreamableServerHead()
  const note = '<!-- Example: </body></html> -->'
  const { shell, end } = prepareStreamingTemplate(head, `<html><head></head><body>${note}<!--app-html--></body></html>`)

  expect(shell.endsWith(`<body>${note}`)).toBe(true)
  expect(end).toBe('</body></html>')
})

it('leaves tags after the document head in their original position', () => {
  const head = createServerHeadWithContext()
  head.push({ title: 'Document title' })

  expect(transformHtmlTemplate(head, '<html><head></head><meta name="example"><body></body></html>')).toBe(
    '<html><head><title>Document title</title></head><meta name="example"><body></body></html>',
  )
})

it('keeps the parsed attributes of an extracted data script', () => {
  const head = createServerHeadWithContext()
  const html = '<html><head><script data-label="A &amp;amp; B" type=application/json/>{"label":"example"}</script></head><body></body></html>'

  expect(transformHtmlTemplate(head, html)).toContain('<script data-label="A &amp;amp; B" type="application/json/">{"label":"example"}</script>')
})

it('locates the stream outlet in HTML outside an inline illustration', () => {
  const illustration = '<svg><g><!--app-html--></g></svg>'
  const template = `<html><head></head><body>${illustration}<main><!--app-html--></main></body></html>`
  const { shell, end } = prepareStreamingTemplate(createStreamableServerHead(), template)

  expect(shell).toContain(`<body>${illustration}<main>`)
  expect(end).toBe('</main></body></html>')
})

it('preserves a literal script type during extraction', () => {
  const head = createServerHeadWithContext()
  const html = '<html><head><script type="true">"sample"</script></head><body></body></html>'

  expect(transformHtmlTemplate(head, html)).toContain('<script type="true">"sample"</script>')
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
