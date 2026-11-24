import { runInNewContext } from 'node:vm'
import { JSDOM } from 'jsdom'
import { createStreamableHead, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'
import { createPatchBoundary } from '../../src/stream/patchBoundary'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'
// The title becomes an event handler if a patch quote ends an app attribute value.
const TITLE = 'x onerror=lateTitle() y'
const encoder = new TextEncoder()

function render(chunks: (string | Uint8Array)[], title = TITLE, lateBody = false, nonce?: string) {
  const { head } = createStreamableHead({ nonce })
  const queue = chunks.map(chunk => typeof chunk === 'string' ? encoder.encode(chunk) : chunk)
  const source = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (queue.length === chunks.length) {
        head.push({ title })
        if (lateBody)
          head.push({ script: [{ src: '/late.js', tagPosition: 'bodyClose' }] })
      }
      controller.enqueue(queue.shift()!)
      if (!queue.length)
        controller.close()
    },
  }, { highWaterMark: 0 })
  return new Response(wrapStream(head, source, TEMPLATE)).text()
}

// Every live event handler in the parsed document.
function handlers(html: string) {
  const { document } = new JSDOM(html).window
  return [...document.querySelectorAll('*')].flatMap(element => [...element.attributes]
    .filter(attribute => attribute.name.startsWith('on'))
    .map(attribute => `${element.localName}.${attribute.name}=${attribute.value}`))
}

function delivered(html: string, title = TITLE) {
  const { document } = new JSDOM(html).window
  return [...document.querySelectorAll('script')].some(script => script.textContent!.includes(title))
}

const documents = {
  'state script': '<script>window.__STATE__={"q":"<img src=x onerror=appData()>"};</script><p>after</p>',
  'escaped script': '<script><!-- <script>var q="<img src=x onerror=appData()>"</script> --></script><p>after</p>',
  'quoted attributes': '<img src="/missing.png" alt="a > b"><p title=\'c > d\'>x</p>',
  'attribute markup': '<img alt="a > <img src=x onerror=appData()>"><p title=\'b > <img src=x onerror=appData()>\'>x</p>',
  'unquoted attribute': '<input value=a/b><p>after</p>',
  'comment': '<!-- a > b <p> --><p>after</p>',
  'textarea': '<textarea>a </b> <script></textarea><p>after</p>',
  'svg title': '<svg><title><img src=x alt="</title>">rest</title></svg><p>after</p>',
  'svg script': '<svg><script><img src=x alt="</script>">rest</script></svg><p>after</p>',
  'foreignObject script': '<svg><foreignObject><script>var a="</svg>";var q="<img src=x onerror=appData()>";</script></foreignObject></svg>',
  'uppercase': '<SCRIPT>var a = 1 < 2;</SCRIPT><P CLASS="x">y</P>',
}

describe('wrapStream patch boundaries', () => {
  it.each(['"', '\''])('keeps a closing script token inside a %s attribute out of script state', async (quote) => {
    const code = 'const label = "a > b"; document.body.dataset.label = label;'
    const markup = `<script data-label=${quote}</script>${quote}>${code}</script>`
    // Include every split to cover opening and closing tags split inside attributes.
    const reportedSplit = markup.indexOf('a >') + 3
    const splits = [reportedSplit, ...Array.from({ length: markup.length - 1 }, (_, index) => index + 1)]
    for (const split of splits) {
      const html = await render([markup.slice(0, split), markup.slice(split)], 'Late title')
      const dom = new JSDOM(html, { runScripts: 'dangerously' })
      const { document } = dom.window

      expect(document.querySelector('#app > script')?.textContent, `split ${split}`).toBe(code)
      expect(document.body.dataset.label, `split ${split}`).toBe('a > b')
      expect((dom.window as any).__unhead__._q, `split ${split}`).toEqual([[{ title: 'Late title' }]])
      dom.window.close()
    }
  })

  it.each(Object.entries(documents))('adds no event handler to the %s at any split', async (_, markup) => {
    const bytes = encoder.encode(markup)
    for (const nonce of [undefined, 'bm9uY2U+/w==']) {
      const expected = handlers(await render([bytes], TITLE, false, nonce))
      for (let split = 1; split < bytes.length; split++) {
        const chunks = [bytes.subarray(0, split), bytes.subarray(split)]
        expect(handlers(await render(chunks, TITLE, false, nonce)), `split at byte ${split}, nonce ${nonce}`).toEqual(expected)
        expect(handlers(await render([chunks[0]!], TITLE, false, nonce)), `end at byte ${split}, nonce ${nonce}`).toEqual(handlers(markup.slice(0, split)))
      }
    }
  }, 30_000)

  it.each([
    ['bm9uY2U+/w==', '<script nonce=bm9uY2U+/w==>'],
    ['a"b', '<script>'],
  ])('writes the CSP nonce %s without quotes', async (nonce, opening) => {
    const html = await render(['<p>First</p>'], 'Late title', false, nonce)

    expect(html).toContain(`<p>First</p>${opening}window.__unhead__&&(`)
  })

  it('writes a late patch after an app chunk that ends outside script content', async () => {
    const html = await render(['<p>First</p>', '<p>Second</p>'], 'Late title')

    expect(html).toMatch(/<p>First<\/p><script>[^<]*Late title[^<]*<\/script><p>Second<\/p>/)
  })

  it('writes no late output after an unclosed app script', async () => {
    const html = await render(['<script>var a = "'], 'Late title')

    expect(html).not.toContain('Late title')
    expect(html).toMatch(/var a = "<\/div><\/body><\/html>$/)
  })

  it('delivers hostile late titles through a quote-free patch', async () => {
    // Quotes, a template expression, a backslash, a line separator and a lone surrogate.
    const title = ['"', '\'', '`', '$' + '{x}', '\\', String.fromCharCode(0x2028, 0xD800), '</script>', '<!-- -->'].join(' ')
    const html = await render(['<p>First</p>'], title)
    const patch = html.match(/<script>(window\.__unhead__&&\([^<]*)<\/script>/)![1]!
    const pushed: unknown[] = []

    runInNewContext(patch, { window: { __unhead__: { push: (updates: unknown) => pushed.push(updates) } }, document: { currentScript: { remove() {} } } })

    // Backticks only delimit the template literal; HTML attribute values end only at quotes.
    expect(patch).not.toMatch(/["']/)
    expect(pushed).toEqual([[{ title }]])
  })

  it.each(['whole', 'split'] as const)('delivers late head and body output after a large JSON script: %s', async (chunking) => {
    const open = '<script type="application/json">'
    const state = JSON.stringify({ data: 'x'.repeat(256 * 1024 + 1) })
    const close = '</script><p>after</p>'
    const html = await render(chunking === 'whole' ? [open + state + close] : [open + state, close], TITLE, true)
    const { document } = new JSDOM(html).window

    expect(document.querySelector('script[type="application/json"]')?.textContent).toBe(state)
    expect(delivered(html)).toBe(true)
    expect(document.querySelector('body > script[src="/late.js"]')).not.toBeNull()
  })

  it.each([
    ['script', ['<!', '-- <scr', 'ipt>'], ['</scr', 'ipt>still escaped -->'], ['</ScRi', 'Pt data-end="', '>">']],
    ['script', ['<!--'], ['--', '>'], ['</scr', 'ipt>']],
    ['textarea', [], [], ['</text', 'area>']],
    ['style', [], [], ['</sty', 'le>']],
  ] as const)('keeps late output out of large %s text split across chunks', async (name, before, after, close) => {
    const data = 'x'.repeat(64 * 1024)
    const text = name === 'style' ? `/*${data}*/` : data
    const content = [...before, text, text, text, text, text, ...after]
    const html = await render([`<${name}>`, ...content, ...close, '<p>after</p>'], TITLE, true)
    const { document } = new JSDOM(html).window

    expect(document.querySelector(`#app > ${name}`)?.textContent).toBe(content.join(''))
    expect(delivered(html)).toBe(true)
    expect(document.querySelector('body > script[src="/late.js"]')).not.toBeNull()
  })
})

describe('createPatchBoundary', () => {
  it.each([
    '<script>a</script>after',
    '<script><!-- <script>x</script> --></script>after',
    '<script><!--<script></script>--></script>after',
    '<SCRIPT>x</SCRIPT >after',
    '<script>a="</script"</script>after',
    '<script>---><!--->--></script>after',
    '<!-- <script> -->text</script>after',
    '<p title="<script>">x</p></script>after',
    '<textarea><script></textarea></script>after',
    '<NoFrames>x</noframes ><!-- <title> -->after',
    '<!-- a --!><p>x</p><!--!>y-->after',
    '<script><!-- --!> <script></script> --></script>after',
  ])('reads %s the same at every chunk boundary', (html) => {
    for (let end = 0; end <= html.length; end++) {
      const prefix = html.slice(0, end)
      const whole = createPatchBoundary()(prefix)
      const byCharacter = createPatchBoundary()
      let atBoundary = byCharacter('')
      for (const character of prefix)
        atBoundary = byCharacter(character)
      expect(atBoundary, `prefix ${JSON.stringify(prefix)}`).toBe(whole)
    }
  })
})
