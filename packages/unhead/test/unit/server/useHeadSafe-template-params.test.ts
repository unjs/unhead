import type { Unhead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe, useSeoMeta } from '../../../src'
import { createHead as createClientHead } from '../../../src/client'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../util'

const HOSTILE = ['x";alert(1);//', '\'', '`', '$' + '{a}'].join('')

async function contentOf(head: Unhead<any>, tag: string) {
  return (await head.resolveTags()).filter(t => t.tag === tag).map(t => t.textContent ?? t.innerHTML ?? t.props.content ?? t.props.href)
}

describe('useHeadSafe titles in template parameters', () => {
  it.each(['hydrated', 'cleared'] as const)('keeps a %s safe title out of active template consumers', async (scenario) => {
    const server = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHeadSafe(server, { title: HOSTILE }, { mode: 'server' })
    const dom = useDom(await renderSSRHead(server))
    const head = scenario === 'hydrated'
      ? createClientHead({ document: dom.window.document, plugins: [TemplateParamsPlugin], domOptions: { render: () => {} } })
      : server
    useHead(head, {
      ...(scenario === 'cleared' ? { titleTemplate: () => null } : {}),
      script: [
        { type: 'text/javascript', textContent: 'window.t = "%s:%pageTitle"', processTemplateParams: true },
        { type: 'module', innerHTML: 'export default "%s:%pageTitle"', processTemplateParams: true },
        { type: 'application/json', textContent: '{"title":"%s"}', processTemplateParams: true },
      ],
      style: [
        { textContent: '/* %s:%pageTitle */', processTemplateParams: true },
        { innerHTML: '/* inner %s:%pageTitle */', processTemplateParams: true },
      ],
      link: [{ rel: 'stylesheet', href: '/%s/%pageTitle/site.css' }],
      meta: [
        { 'http-equiv': 'refresh', 'content': '0;url=/%s/%pageTitle' },
        { name: 'description', content: '%s' },
      ],
      htmlAttrs: { lang: '%s' },
    })

    const tags = await head.resolveTags()
    expect(tags.find(t => t.tag === 'title')?.textContent).toBe(scenario === 'hydrated' ? HOSTILE : undefined)
    expect(tags.find(t => t.tag === 'script' && t.props.type === 'text/javascript')?.textContent).toBe('window.t = "%s:%pageTitle"')
    expect(tags.find(t => t.props.type === 'module')?.innerHTML).toBe('export default "%s:%pageTitle"')
    expect(tags.find(t => t.tag === 'style')?.textContent).toBe('/* %s:%pageTitle */')
    expect(tags.find(t => t.tag === 'style' && t.innerHTML)?.innerHTML).toBe('/* inner %s:%pageTitle */')
    expect(tags.find(t => t.tag === 'link')?.props.href).toBe('/%s/%pageTitle/site.css')
    expect(tags.find(t => t.props['http-equiv'])?.props.content).toBe('0;url=/%s/%pageTitle')
    expect(tags.find(t => t.props.name === 'description')?.props.content).toBe(HOSTILE)
    expect(tags.find(t => t.tag === 'htmlAttrs')?.props.lang).toBe(HOSTILE)
    expect(JSON.parse(tags.find(t => t.tag === 'script' && t.props.type === 'application/json')!.textContent!)).toEqual({ title: HOSTILE })

    const appTitle = useHead(head, { title: 'Guide' })
    expect(await contentOf(head, 'script')).toContain('window.t = "Guide:Guide"')
    appTitle.dispose()
    expect(await contentOf(head, 'script')).toContain('window.t = "%s:%pageTitle"')
  })

  it.each([
    ['script %pageTitle', { script: [{ type: 'text/javascript', textContent: 'window.t = "%pageTitle"', processTemplateParams: true }] }, 'script', 'window.t = "%pageTitle"'],
    ['script %s', { script: [{ type: 'text/javascript', textContent: 'window.t = "%s"', processTemplateParams: true }] }, 'script', 'window.t = "%s"'],
    ['style', { style: [{ textContent: '/* %s */', processTemplateParams: true }] }, 'style', '/* %s */'],
    ['http-equiv', { meta: [{ 'http-equiv': 'refresh', 'content': '%s' }] }, 'meta', '%s'],
    ['link href', { link: [{ rel: 'stylesheet', href: '/assets/%s/site.css' }] }, 'link', '/assets/%s/site.css'],
  ] as const)('keeps a safe title out of an app %s', async (_, input, tag, expected) => {
    for (const createHead of [createServerHeadWithContext, createClientHeadWithContext]) {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      useHead(head, input as any)
      useHeadSafe(head, { title: HOSTILE })
      expect(await contentOf(head, tag)).toEqual([expected])
    }
  })

  it('keeps a safe title out of an app refresh directive from useSeoMeta', async () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useSeoMeta(head, { refresh: '0;url=/%s' } as any)
    useHeadSafe(head, { title: HOSTILE })

    expect((await head.resolveTags()).find(t => t.tag === 'meta')?.props).toMatchObject({ 'http-equiv': 'refresh', 'content': '0;url=/%s' })
  })

  it('keeps a root-relative URL on the same origin when a safe title is held back', async () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, {
      link: [{ rel: 'stylesheet', href: '/%s/assets.example.test/site.css' }],
      meta: [{ 'http-equiv': 'refresh', 'content': '0;url=/%s/example.test' }],
    })
    useHeadSafe(head, { title: 'guide' })
    const tags = await head.resolveTags()

    expect(tags.find(t => t.tag === 'link')?.props.href).toBe('/%s/assets.example.test/site.css')
    expect(tags.find(t => t.tag === 'meta')?.props.content).toBe('0;url=/%s/example.test')
  })

  it('keeps a safe title out of an app referrer policy', async () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, { meta: [{ name: 'referrer', content: '%s' }] })
    useHeadSafe(head, { title: 'unsafe-url' })

    expect((await head.resolveTags()).find(t => t.tag === 'meta')?.props.content).toBe('%s')
  })

  it('fills display fields and JSON scripts with a safe title', async () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, {
      titleTemplate: '%s | Docs',
      meta: [{ name: 'description', content: 'Read %s' }],
      script: [{ type: 'application/ld+json', textContent: '{"name":"%s"}', processTemplateParams: true }],
    })
    useHeadSafe(head, { title: HOSTILE })
    const tags = await head.resolveTags()

    expect(tags.find(t => t.tag === 'title')?.textContent).toBe(`${HOSTILE} | Docs`)
    expect(tags.find(t => t.tag === 'meta')?.props.content).toBe(`Read ${HOSTILE}`)
    expect(JSON.parse(tags.find(t => t.tag === 'script')!.textContent!)).toEqual({ name: HOSTILE })
  })

  it('fills app scripts with an app title', async () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, { title: 'Guide', script: [{ type: 'text/javascript', textContent: 'window.t = "%s"', processTemplateParams: true }] })

    expect(await contentOf(head, 'script')).toEqual(['window.t = "Guide"'])
  })

  it.each([false, true])('ignores safe template parameters, safe first: %s', async (safeFirst) => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    const app = () => useHead(head, {
      templateParams: { site: 'Docs' },
      script: [{ type: 'text/javascript', textContent: 'window.site = "%site"', processTemplateParams: true }],
    })
    const guest = () => useHeadSafe(head, { templateParams: { site: HOSTILE, separator: '"' } })
    if (safeFirst) {
      guest()
      app()
    }
    else {
      app()
      guest()
    }

    expect(await contentOf(head, 'script')).toEqual(['window.site = "Docs"'])
  })

  it('keeps server-only safe template parameters out of the client payload', async () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHeadSafe(head, { templateParams: { site: HOSTILE } }, { mode: 'server' })

    expect(JSON.stringify(await renderSSRHead(head))).not.toContain('alert(1)')
  })
})
