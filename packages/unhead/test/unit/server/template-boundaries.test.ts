import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { prepareTemplate, transformHtmlTemplate, transformHtmlTemplateRaw } from '../../../src/server'
import { prepareStreamingTemplate, renderSSRHeadSuspenseChunk, renderStreamEnd, wrapStream } from '../../../src/stream/server'
import { createServerHeadWithContext, createStreamableServerHead } from '../../util'

const renderers = [
  ['extracting', transformHtmlTemplate],
  ['raw', transformHtmlTemplateRaw],
  ['prepared', (head: ReturnType<typeof createServerHeadWithContext>, html: string) => transformHtmlTemplateRaw(head, prepareTemplate(html))],
] as const

const integrationScopes = [
  '<table><tbody><tr><td>Cell</td></tr></tbody></table>',
  '<table><tbody><tr><td>First<td>Second</tr></tbody></table>',
  '<table><thead><tr><th>Heading</thead><tbody><tr><td>Cell</tbody></table>',
  '<table><tr><td>Cell</table>',
  '<select><option>Choice</option></select>',
  '<select><optgroup label="Group"><option>First<option>Second</optgroup></select>',
  '<select><option><strong>Choice</strong> <em>details</em></option></select>',
  '<template><!-- app-html --><table><tr><td>Cell</table></template>',
  '<select><template><option>Choice</option></template><option>Last</option></select>',
]
const integrationPoints = [
  ['<svg><foreignObject>', '</foreignObject></svg>'],
  ['<math><annotation-xml encoding="text/html">', '</annotation-xml></math>'],
] as const

describe.each(renderers)('%s template boundaries', (_, render) => {
  it.each(integrationScopes)('inserts body-close tags after HTML scopes in integration points: %s', (content) => {
    for (const [open, close] of integrationPoints) {
      const head = createServerHeadWithContext()
      head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
      const prefix = `<html><head></head><body>${open}${content}${close}<main><!-- app-html --></main>`

      expect(render(head, `${prefix}</body></html>`)).toBe(
        `${prefix}<style>p { color: black }</style></body></html>`,
      )
    }
  })

  it('inserts body-close tags after a select containing a template', () => {
    const head = createServerHeadWithContext()
    head.push({ script: [{ src: '/injected.js', tagPosition: 'bodyClose' }] })
    const prefix = '<html><head></head><body><select><template><option>Example</option></template><option>Last</option></select><main><!-- app-html --></main>'

    expect(render(head, `${prefix}</body></html>`)).toBe(
      `${prefix}<script src="/injected.js"></script></body></html>`,
    )
  })

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

  it('locates the document body end after object fallback content', () => {
    const head = createServerHeadWithContext()
    head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
    const prefix = '<html><head></head><body><object><p>Fallback</p></body></object><main>Content</main>'

    expect(render(head, `${prefix}</body></html>`)).toBe(
      `${prefix}<style>p { color: black }</style></body></html>`,
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
    '<svg><foreignObject><div><p>Illustration label</div></foreignObject></svg>',
    '<table><tr><td>Table cell</table>',
    '<math><semantics><mi>x</mi><annotation-xml encoding="text/html"><div>Label</div></annotation-xml></semantics></math>',
    '<main>Article</main></frameset>',
  ])('inserts body tags after %s', (body) => {
    const head = createServerHeadWithContext()
    head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
    const prefix = `<html><head></head><body>${body}`

    expect(render(head, `${prefix}</body></html>`)).toBe(
      `${prefix}<style>p { color: black }</style></body></html>`,
    )
  })

  it('recognizes document whitespace written as a character reference', () => {
    const head = createServerHeadWithContext()
    head.push({ title: 'Document title' })

    expect(render(head, '&#32;<html><head>&Tab;</head><body></body></html>')).toBe(
      '&#32;<html><head>&Tab;<title>Document title</title></head><body></body></html>',
    )
  })
})

it.each([false, true])('streams after HTML scopes inside foreign content, prepared: %s', (prepared) => {
  for (const content of integrationScopes) {
    for (const [open, close] of integrationPoints) {
      const head = createStreamableServerHead()
      head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
      const illustration = `${open}${content}${close}`
      const template = `<html><head></head><body>${illustration}<main><!-- app-html --></main></body></html>`
      const { shell, end } = prepareStreamingTemplate(head, prepared ? prepareTemplate(template) : template)

      expect(shell.endsWith(`${illustration}<main>`)).toBe(true)
      expect(end).toBe('</main><style>p { color: black }</style></body></html>')
    }
  }
})

it('leaves an unsplit stream shell and its app content in source order', async () => {
  const head = createStreamableServerHead()
  const template = '<html><head></head><body>'
  const app = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('<main>Content</main>'))
      controller.close()
    },
  })

  const html = await new Response(wrapStream(head, app, template, undefined, {
    flushChunk: () => '<!-- Late update -->',
  })).text()

  expect(html.slice(html.indexOf('</head>'))).toBe('</head><body><main>Content</main>')
})

it('leaves body tags out when a stream template has no body end', () => {
  const head = createStreamableServerHead({ writesBodyTags: true })
  const parts = prepareStreamingTemplate(head, '<html><head></head><body>')
  head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
  renderSSRHeadSuspenseChunk(head)

  expect(renderStreamEnd(head, parts)).toBe('')
})

it.each([false, true])('mounts streamed content after a foreignObject table, prepared: %s', async (prepared) => {
  const head = createStreamableServerHead()
  head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
  const template = '<html><head></head><body><svg><foreignObject><table><tr><td>Cell</td></tr></table></foreignObject></svg><main><!-- app-html --></main></body></html>'
  const app = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('<p>Streamed app</p>'))
      controller.close()
    },
  })

  const html = await new Response(wrapStream(head, app, prepared ? prepareTemplate(template) : template)).text()
  const document = new JSDOM(html).window.document

  expect(document.querySelector('main')?.innerHTML).toBe('<p>Streamed app</p>')
  expect(document.body.lastElementChild?.outerHTML).toBe('<style>p { color: black }</style>')
})

it.each([false, true])('splits the stream after a select containing a template, prepared: %s', (prepared) => {
  const select = '<select><template><!-- app-html --><option>Example</option></template><option>Last</option></select>'
  const template = `<html><head></head><body>${select}<main><!-- app-html --></main></body></html>`
  const { shell, end } = prepareStreamingTemplate(createStreamableServerHead(), prepared ? prepareTemplate(template) : template)

  expect(shell.endsWith(`${select}<main>`)).toBe(true)
  expect(end).toBe('</main></body></html>')
})

it.each([false, true])('splits the stream after formatted select options, prepared: %s', (prepared) => {
  const select = '<select><option><div><strong>Choice</strong> <em>details</em></div></option></select>'
  const template = `<html><head></head><body>${select}<main><!-- app-html --></main></body></html>`
  const { shell, end } = prepareStreamingTemplate(createStreamableServerHead(), prepared ? prepareTemplate(template) : template)

  expect(shell.endsWith(`${select}<main>`)).toBe(true)
  expect(end).toBe('</main></body></html>')
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
