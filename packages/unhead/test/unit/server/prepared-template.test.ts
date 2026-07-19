import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { prepareTemplate } from '../../../src/parser'
import { transformHtmlTemplate, transformHtmlTemplateRaw } from '../../../src/server/transformHtmlTemplate'
import { prepareStreamingTemplate, renderSSRHeadShell, wrapStream } from '../../../src/stream/server'
import { createServerHeadWithContext, createStreamableServerHead } from '../../util'

const fixtureHtml = readFileSync(join(__dirname, '../../fixtures/Markdown.html'), 'utf-8')

const templates: Record<string, string> = {
  'well-formed': '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Original</title></head><body class="dark"><div id="app"></div></body></html>',
  'with ssr outlet marker': '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div><script src="/entry.js"></script></body></html>',
  'with app-html marker and whitespace': '<html><head></head><body><main><!-- app-html --></main></body></html>',
  'minimal': '<html><head></head><body></body></html>',
  'missing html tag': '<head></head><body>Content</body>',
  'missing head': '<html><body>Content</body></html>',
  'missing body': '<html><head></head>Content</html>',
  'missing closing body': '<html><head><title>Original</title></head><body>Content',
  'no tags at all': '<div>Content</div>',
  'empty': '',
  'body close before body open': '<html><head></head></body><body>Content</body></html>',
  'html tag inside body': '<head></head><body>pre <html lang="x">Content</body>',
  'fixture': fixtureHtml,
}

const input = {
  title: 'Test Title',
  htmlAttrs: { 'data-injected': 'true' },
  bodyAttrs: { class: 'injected' },
  meta: [{ name: 'description', content: 'desc' }],
  script: [{ src: '/injected.js', tagPosition: 'bodyClose' as const }],
}

function serverHead() {
  const head = createServerHeadWithContext()
  head.push(input)
  return head
}

function streamHead() {
  const head = createStreamableServerHead()
  head.push(input)
  return head
}

describe('prepareTemplate', () => {
  it('owns the exact html string it was created from', () => {
    const prepared = prepareTemplate(templates['well-formed'])
    expect(prepared.html).toBe(templates['well-formed'])
    expect(prepared.indexes.headTagEnd).toBeGreaterThan(0)
    expect(Object.isFrozen(prepared)).toBe(true)
    expect(Object.isFrozen(prepared.input)).toBe(true)
    expect(Object.isFrozen(prepared.indexes)).toBe(true)
    expect(Reflect.set(prepared, 'html', '')).toBe(false)
  })

  describe('string and prepared inputs produce byte-identical output', () => {
    for (const [name, template] of Object.entries(templates)) {
      it(`transformHtmlTemplate: ${name}`, () => {
        const prepared = prepareTemplate(template)
        expect(transformHtmlTemplate(serverHead(), prepared)).toBe(transformHtmlTemplate(serverHead(), template))
      })

      it(`transformHtmlTemplateRaw: ${name}`, () => {
        const prepared = prepareTemplate(template)
        expect(transformHtmlTemplateRaw(serverHead(), prepared)).toBe(transformHtmlTemplateRaw(serverHead(), template))
      })

      it(`renderSSRHeadShell: ${name}`, () => {
        const prepared = prepareTemplate(template)
        expect(renderSSRHeadShell(streamHead(), prepared)).toBe(renderSSRHeadShell(streamHead(), template))
      })

      it(`prepareStreamingTemplate: ${name}`, () => {
        const prepared = prepareTemplate(template)
        expect(prepareStreamingTemplate(streamHead(), prepared)).toEqual(prepareStreamingTemplate(streamHead(), template))
      })
    }
  })

  describe('reuse across renders', () => {
    it('produces correct output for each request without internal mutation', () => {
      const template = templates['with ssr outlet marker']
      const prepared = prepareTemplate(template)
      const htmlBefore = prepared.html
      const indexesBefore = { ...prepared.indexes }

      for (let i = 0; i < 3; i++) {
        const head = createServerHeadWithContext()
        head.push({ title: `Request ${i}` })
        const result = transformHtmlTemplateRaw(head, prepared)
        expect(result).toContain(`<title>Request ${i}</title>`)
        expect(result).toBe(transformHtmlTemplateRaw(head, template))
      }

      expect(prepared.html).toBe(htmlBefore)
      expect(prepared.indexes).toEqual(indexesBefore)
    })

    it('transformHtmlTemplate reuses a prepared template without mutating it', () => {
      const template = '<html data-template="1"><head><title>From Template</title><meta name="existing" content="yes"></head><body>App</body></html>'
      const prepared = prepareTemplate(template)
      const keys = Reflect.ownKeys(prepared)

      const first = transformHtmlTemplate(serverHead(), prepared)
      const second = transformHtmlTemplate(serverHead(), prepared)
      expect(Reflect.ownKeys(prepared)).toEqual(keys)
      expect(second).toBe(first)
      expect(second).toBe(transformHtmlTemplate(serverHead(), template))
    })

    it('prepareStreamingTemplate reused across requests', () => {
      const prepared = prepareTemplate(templates['with ssr outlet marker'])
      const fromString = prepareStreamingTemplate(streamHead(), templates['with ssr outlet marker'])
      for (let i = 0; i < 3; i++) {
        expect(prepareStreamingTemplate(streamHead(), prepared)).toEqual(fromString)
      }
    })
  })

  describe('streaming', () => {
    it('prepareStreamingTemplate with a prepared template clears entries only on success', () => {
      const head = streamHead()
      const prepared = prepareTemplate(templates['with ssr outlet marker'])
      const { shell, end } = prepareStreamingTemplate(head, prepared)
      expect(shell).toContain('<title>Test Title</title>')
      expect(shell).toContain('<div id="app">')
      expect(end).toContain('</div>')
      expect(end).toContain('src="/injected.js"')
      expect(head.entries.size).toBe(0)
    })

    it('wrapStream accepts a prepared template', async () => {
      const prepared = prepareTemplate(templates['with ssr outlet marker'])
      const makeAppStream = () => new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('<h1>App</h1>'))
          controller.close()
        },
      })

      const read = async (stream: ReadableStream<Uint8Array>) => {
        const chunks: string[] = []
        const decoder = new TextDecoder()
        for await (const chunk of stream as any) {
          chunks.push(decoder.decode(chunk, { stream: true }))
        }
        return chunks.join('')
      }

      const fromPrepared = await read(wrapStream(streamHead(), makeAppStream(), prepared))
      const fromString = await read(wrapStream(streamHead(), makeAppStream(), templates['with ssr outlet marker']))
      expect(fromPrepared).toBe(fromString)
      expect(fromPrepared).toContain('<h1>App</h1>')
      expect(fromPrepared).toContain('<title>Test Title</title>')
    })
  })
})
