import type { Unhead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe, useSeoMeta } from '../../../src'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, createServerHeadWithContext } from '../../util'

const HOSTILE = ['x";alert(1);//', '\'', '`', '$' + '{a}'].join('')

async function contentOf(head: Unhead<any>, tag: string) {
  return (await head.resolveTags()).filter(t => t.tag === tag).map(t => t.textContent ?? t.innerHTML ?? t.props.content ?? t.props.href)
}

describe('useHeadSafe titles in template parameters', () => {
  it.each([
    ['script %pageTitle', { script: [{ type: 'text/javascript', textContent: 'window.t = "%pageTitle"', processTemplateParams: true }] }, 'script', 'window.t = ""'],
    ['script %s', { script: [{ type: 'text/javascript', textContent: 'window.t = "%s"', processTemplateParams: true }] }, 'script', 'window.t = ""'],
    ['style', { style: [{ textContent: '/* %s */', processTemplateParams: true }] }, 'style', '/*  */'],
    ['http-equiv', { meta: [{ 'http-equiv': 'refresh', 'content': '%s' }] }, 'meta', ''],
    ['link href', { link: [{ rel: 'stylesheet', href: '/assets/%s/site.css' }] }, 'link', '/assets//site.css'],
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

    expect((await head.resolveTags()).find(t => t.tag === 'meta')?.props).toMatchObject({ 'http-equiv': 'refresh', 'content': '0;url=/' })
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
