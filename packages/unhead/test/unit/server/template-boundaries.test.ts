import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { prepareTemplate, transformHtmlTemplate, transformHtmlTemplateRaw } from '../../../src/server'
import { prepareStreamingTemplate, wrapStream } from '../../../src/stream/server'
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
  '<table><tr><td><p>Label</td></tr></table>',
  '<table><tr><td>Cell</table>',
  '<ruby>漢<rt>kan</ruby>',
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
    '<svg><defs><font id="logo"><font-face font-family="Logo"/><glyph unicode="A" /></font></defs></svg>',
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

it.each([false, true])('keeps late tags when optional body and html end tags are omitted, prepared: %s', async (prepared) => {
  const head = createStreamableServerHead()
  const template = '<html><head></head><body>'
  const app = new ReadableStream<Uint8Array>({
    pull(controller) {
      head.push({ title: 'Late title', style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
      controller.enqueue(new TextEncoder().encode('<main>Content</main>'))
      controller.close()
    },
  })

  const html = await new Response(wrapStream(head, app, prepared ? prepareTemplate(template) : template)).text()

  expect(html).toContain('</head><body><main>Content</main>')
  expect(html).toContain('Late title')
  expect(html.endsWith('<style>p { color: black }</style>')).toBe(true)
})

describe.each([false, true])('streaming without a verified body close, prepared: %s', (prepared) => {
  it.each([
    '<',
    '<!-- unfinished comment',
    '<div class="example',
    '<textarea>Content',
    '<table><tr><td>Cell',
    '<svg><g>Label</g>',
    '<svg><circle cx="2" /><meta name="example" content="label" /><rect width="3" /></svg></body></html>',
    '<select><option><meter></meter></option></select></body></html>',
  ])('rejects a template with an unverified end: %s', async (content) => {
    const template = `<html><head></head><body>${content}`
    const app = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<main>App content</main>'))
        controller.close()
      },
    })

    const rendered = wrapStream(createStreamableServerHead(), app, prepared ? prepareTemplate(template) : template)

    await expect(new Response(rendered).text()).rejects.toThrow('Cannot stream an incomplete or unsupported HTML template.')
  })

  it('keeps the fallback when the template omits the opening body tag', async () => {
    const template = '<html><head></head><p>Intro</p></body></html>'
    const app = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<main>App content</main>'))
        controller.close()
      },
    })

    const rendered = wrapStream(createStreamableServerHead(), app, prepared ? prepareTemplate(template) : template)

    expect(await new Response(rendered).text()).toContain('<p>Intro</p></body></html><main>App content</main>')
  })
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

describe.each([false, true])('customizable select streaming, prepared: %s', (prepared) => {
  it.each([
    '<select><optgroup label="Group"><legend>Group</legend><option>Choice</option></optgroup></select>',
    '<select><option><svg viewBox="0 0 10 10"><title>Icon</title><g><path d="M0 0h10"/></g></svg>Choice</option></select>',
    '<select><option><svg><desc>Icon<!-- app-html --></desc><use href="#icon" /></svg>Choice</option></select>',
    '<select><optgroup label="Group"><legend>Group</legend><option><svg><title>Icon</title><path d="M0 0h10"/></svg>Choice</option></optgroup></select>',
  ])('mounts streamed content and inserts initial body-close tags after %s', async (select) => {
    for (const [open, close] of [['', ''], ...integrationPoints]) {
      const head = createStreamableServerHead()
      head.push({ script: [{ src: '/initial.js', tagPosition: 'bodyClose' }] })
      const template = `<html><head></head><body>${open}${select}${close}<main><!-- app-html --></main></body></html>`
      const app = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('<p>Streamed app</p>'))
          controller.close()
        },
      })

      const html = await new Response(wrapStream(head, app, prepared ? prepareTemplate(template) : template)).text()
      const document = new JSDOM(html).window.document

      expect(document.querySelector('main')?.innerHTML).toBe('<p>Streamed app</p>')
      expect(html).toContain('</main><script src="/initial.js"></script></body>')
    }
  })
})

it('keeps the template intact when a select icon uses CDATA', () => {
  const head = createServerHeadWithContext()
  head.push({ style: [{ textContent: 'p { color: black }', tagPosition: 'bodyClose' }] })
  const template = '<html><head></head><body><select><option><svg><![CDATA[Icon label]]></svg>Choice</option></select></body></html>'

  expect(transformHtmlTemplateRaw(head, template)).toBe(template)
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

it.each(['content-security-policy', 'Content-Security-Policy', 'Content-Securit&#121;-Policy'])('keeps the source policy directive in its head position: %s', (pragma) => {
  const head = createServerHeadWithContext()
  head.push({ title: 'Page' })
  const policy = `<meta http-equiv="${pragma}" content="default-src 'self'">`
  const fallback = '<noscript>JavaScript is disabled.</noscript>'
  const template = `<html><head>${policy}${fallback}</head><body></body></html>`

  expect(transformHtmlTemplate(head, template)).toContain(`<head>${policy}${fallback}<title>Page</title></head>`)
})

it.each([false, true])('replaces a template policy at its source position, prepared: %s', (prepared) => {
  const template = '<html><head><!--before--><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"><!--after--></head><body></body></html>'
  const head = createServerHeadWithContext()
  head.push({ meta: [{ 'http-equiv': 'content-security-policy', 'content': 'script-src https://scripts.example' }] })

  const html = transformHtmlTemplate(head, prepared ? prepareTemplate(template) : template)
  const policies = new JSDOM(html).window.document.querySelectorAll('meta[http-equiv="content-security-policy"]')

  expect(Array.from(policies, policy => policy.getAttribute('content'))).toEqual(['script-src https://scripts.example'])
  expect(html).toContain('<!--before--><meta http-equiv="content-security-policy" content="script-src https://scripts.example"><!--after-->')
})

it.each([false, true])('keeps an independently keyed policy additive, default override: %s', (override) => {
  const source = '<meta http-equiv="content-security-policy" content="default-src \'self\'">'
  const replacement = '<meta http-equiv="content-security-policy" content="default-src \'none\'">'
  const template = prepareTemplate(`<html><head><!--before-->${source}<!--after--></head><body></body></html>`)
  const head = createServerHeadWithContext()
  head.push({ meta: [{ 'key': 'images', 'http-equiv': 'content-security-policy', 'content': 'img-src https://assets.example' }] })
  if (override)
    head.push({ meta: [{ 'http-equiv': 'content-security-policy', 'content': 'default-src \'none\'' }] })

  const html = transformHtmlTemplate(head, template)
  const policies = new JSDOM(html).window.document.querySelectorAll('meta[http-equiv="content-security-policy"]')

  expect(html).toContain(`<!--before-->${override ? replacement : source}<!--after-->`)
  expect(Array.from(policies, policy => policy.getAttribute('content'))).toEqual([
    override ? 'default-src \'none\'' : 'default-src \'self\'',
    'img-src https://assets.example',
  ])
})

it('keeps the source policy when a render hook rewrites the managed policy', () => {
  const source = '<meta http-equiv="content-security-policy" content="default-src \'self\'">'
  const extra = '<meta http-equiv="content-security-policy" content="img-src https://assets.example">'
  const template = `<html><head>${source}<!--source policy--></head><body></body></html>`
  const head = createServerHeadWithContext()
  head.push({ meta: [{ 'http-equiv': 'content-security-policy', 'content': 'default-src \'none\'' }] })
  head.hooks.hook('ssr:rendered', ({ html }) => {
    html.headTags = extra
  })

  expect(transformHtmlTemplate(head, template)).toContain(`${source}<!--source policy-->${extra}</head>`)
})

it.each([false, true])('keeps distinct source policies at their own positions, prepared: %s', (prepared) => {
  const first = '<meta http-equiv="content-security-policy" content="script-src \'self\'">'
  const second = '<meta http-equiv="content-security-policy" content="img-src \'self\'">'
  const template = `<html><head>${first}<!--between-->${second}</head><body></body></html>`
  const head = createServerHeadWithContext()

  const html = transformHtmlTemplate(head, prepared ? prepareTemplate(template) : template)

  expect(html).toContain(`<head>${first}<!--between-->${second}</head>`)
})

it.each([
  { content: 'img-src https://assets.example', tagPosition: 'bodyClose' as const },
  { content: '' },
])('keeps the source policy without an applicable managed head replacement: %j', (managed) => {
  const policy = '<meta http-equiv="content-security-policy" content="default-src \'self\'">'
  const template = `<html><head>${policy}</head><body></body></html>`
  const head = createServerHeadWithContext()
  head.push({ meta: [{ 'http-equiv': 'content-security-policy', ...managed }] })

  const html = transformHtmlTemplate(head, template)

  expect(html).toContain(`<head>${policy}`)
})

it('keeps source bootstrap scripts before the policies that followed them', () => {
  const bootstrap = '<script src="/bootstrap.js"></script>'
  const policy = '<meta http-equiv="content-security-policy" content="script-src \'self\'">'
  const template = `<html><head>${bootstrap}${policy}</head><body></body></html>`
  const head = createServerHeadWithContext()

  const html = transformHtmlTemplate(head, template)

  expect(html).toContain(`<head>${bootstrap}${policy}</head>`)
})

it.each([
  { encoding: '<meta charset="utf-8">', prepared: false },
  { encoding: '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">', prepared: true },
])('keeps the encoding and resource order before a source policy, prepared: $prepared', ({ encoding, prepared }) => {
  const prefix = `${encoding}<base href="/assets/"><script src="bootstrap.js"></script><link rel="stylesheet" href="page.css"><style>main { color: black }</style>`
  const policy = '<meta http-equiv="content-security-policy" content="default-src \'self\'">'
  const template = `<html><head><meta name="description" content="Source">${prefix}${policy}</head><body></body></html>`
  const head = createServerHeadWithContext()
  head.push({ meta: [{ name: 'description', content: 'Managed' }] })

  const html = transformHtmlTemplate(head, prepared ? prepareTemplate(template) : template)

  expect(html).toContain(`<head>${prefix}${policy}<meta name="description" content="Managed"></head>`)
})

it('places a managed policy directive before stylesheets regardless of case', () => {
  const head = createServerHeadWithContext()
  head.push({
    link: [{ rel: 'stylesheet', href: '/page.css' }],
    meta: [{ 'http-equiv': 'Content-Security-Policy', 'content': 'default-src \'self\'' }],
  })

  const html = transformHtmlTemplateRaw(head, '<html><head></head><body></body></html>')

  expect(Array.from(new JSDOM(html).window.document.head.children, element => element.localName))
    .toEqual(['meta', 'link'])
})

it.each([false, true])('uses the outlet outside a select, prepared: %s', (prepared) => {
  const select = '<select><option>Example<!--app-html--></option></select>'
  const template = `<html><head></head><body>${select}<main><!--app-html--></main></body></html>`
  const { shell, end } = prepareStreamingTemplate(createStreamableServerHead(), prepared ? prepareTemplate(template) : template)

  expect(shell).toContain(`<body>${select}<main>`)
  expect(end).toBe('</main></body></html>')
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
