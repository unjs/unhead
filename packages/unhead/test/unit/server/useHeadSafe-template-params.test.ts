import type { Unhead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe, useSeoMeta } from '../../../src'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { resolveTags } from '../../../src/utils'
import { createClientHeadWithContext, createServerHeadWithContext } from '../../util'

const HOSTILE = ['x";alert(1);//', '\'', '`', '$' + '{a}'].join('')

function tagsOf(head: Unhead<any>) {
  return resolveTags(head)
}

function contentOf(head: Unhead<any>, tag: string) {
  return tagsOf(head).filter(t => t.tag === tag).map(t => t.textContent ?? t.innerHTML ?? t.props.content ?? t.props.href)
}

describe('useHeadSafe titles in template parameters', () => {
  it.each(['Guest', HOSTILE])('keeps a suppressed safe title out of executable fields: %s', (title) => {
    for (const createHead of [createServerHeadWithContext, createClientHeadWithContext]) {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      useHead(head, {
        titleTemplate: () => null,
        script: [
          { textContent: 'window.t = "%s"', processTemplateParams: true },
          { innerHTML: 'window.p = "%pageTitle"', processTemplateParams: true },
          { type: 'application/ld+json', textContent: '{"name":"%s"}', processTemplateParams: true },
        ],
        style: [{ textContent: '/* %s */', processTemplateParams: true }],
        link: [{ rel: 'stylesheet', href: '/assets/%s/site.css' }],
        meta: [
          { 'http-equiv': 'refresh', 'content': '0;url=/%pageTitle' },
          { name: 'description', content: 'Read %s' },
        ],
      })
      useHeadSafe(head, { title })

      const tags = tagsOf(head)
      expect(tags.find(t => t.tag === 'title')).toBeUndefined()
      const scripts = tags.filter(t => t.tag === 'script')
      expect(scripts[0]?.textContent).toBe('window.t = "%s"')
      expect(scripts[1]?.innerHTML).toBe('window.p = "%pageTitle"')
      expect(JSON.parse(scripts[2]!.textContent!)).toEqual({ name: title })
      expect(tags.find(t => t.tag === 'style')?.textContent).toBe('/* %s */')
      expect(tags.find(t => t.tag === 'link')?.props.href).toBe('/assets/%s/site.css')
      expect(tags.find(t => t.props['http-equiv'])?.props.content).toBe('0;url=/%pageTitle')
      expect(tags.find(t => t.props.name === 'description')?.props.content).toBe(`Read ${title}`)
    }
  })

  it.each([
    ['script %pageTitle', { script: [{ textContent: 'window.t = "%pageTitle"', processTemplateParams: true }] }, 'script', 'window.t = "%pageTitle"'],
    ['script %s', { script: [{ textContent: 'window.t = "%s"', processTemplateParams: true }] }, 'script', 'window.t = "%s"'],
    ['style', { style: [{ textContent: '/* %s */', processTemplateParams: true }] }, 'style', '/* %s */'],
    ['http-equiv', { meta: [{ 'http-equiv': 'refresh', 'content': '%s' }] }, 'meta', '%s'],
    ['link href', { link: [{ rel: 'stylesheet', href: '/assets/%s/site.css' }] }, 'link', '/assets/%s/site.css'],
  ] as const)('keeps a safe title out of an app %s', (_, input, tag, expected) => {
    for (const createHead of [createServerHeadWithContext, createClientHeadWithContext]) {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      useHead(head, input as any)
      useHeadSafe(head, { title: HOSTILE })
      expect(contentOf(head, tag)).toEqual([expected])
    }
  })

  it('keeps a safe title out of an app refresh directive from useSeoMeta', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useSeoMeta(head, { refresh: '0;url=/%s' } as any)
    useHeadSafe(head, { title: HOSTILE })

    expect(tagsOf(head).find(t => t.tag === 'meta')?.props).toMatchObject({ 'http-equiv': 'refresh', 'content': '0;url=/%s' })
  })

  it('keeps a root-relative URL on the same origin when a safe title is held back', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, {
      link: [{ rel: 'stylesheet', href: '/%s/assets.example.test/site.css' }],
      meta: [{ 'http-equiv': 'refresh', 'content': '0;url=/%s/example.test' }],
    })
    useHeadSafe(head, { title: 'guide' })
    const tags = tagsOf(head)

    expect(tags.find(t => t.tag === 'link')?.props.href).toBe('/%s/assets.example.test/site.css')
    expect(tags.find(t => t.tag === 'meta')?.props.content).toBe('0;url=/%s/example.test')
  })

  it('keeps a safe title out of an app referrer policy', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, { meta: [{ name: 'referrer', content: '%s' }] })
    useHeadSafe(head, { title: 'unsafe-url' })

    expect(tagsOf(head).find(t => t.tag === 'meta')?.props.content).toBe('%s')
  })

  it('fills display fields and JSON scripts with a safe title', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, {
      titleTemplate: '%s | Docs',
      meta: [{ name: 'description', content: 'Read %s' }],
      script: [{ type: 'application/ld+json', textContent: '{"name":"%s"}', processTemplateParams: true }],
    })
    useHeadSafe(head, { title: HOSTILE })
    const tags = tagsOf(head)

    expect(tags.find(t => t.tag === 'title')?.textContent).toBe(`${HOSTILE} | Docs`)
    expect(tags.find(t => t.tag === 'meta')?.props.content).toBe(`Read ${HOSTILE}`)
    expect(JSON.parse(tags.find(t => t.tag === 'script')!.textContent!)).toEqual({ name: HOSTILE })
  })

  it('fills app scripts with an app title', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, { title: 'Guide', script: [{ textContent: 'window.t = "%s"', processTemplateParams: true }] })

    expect(contentOf(head, 'script')).toEqual(['window.t = "Guide"'])
  })

  it('keeps an app title in app scripts when a safe entry sets the title template', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, { title: 'Guide', script: [{ textContent: 'window.t = "%s"', processTemplateParams: true }] })
    useHeadSafe(head, { titleTemplate: `%s ${HOSTILE}` })

    expect(contentOf(head, 'script')).toEqual(['window.t = "Guide"'])
  })

  it.each([false, true])('ignores safe template parameters, safe first: %s', (safeFirst) => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    const app = () => useHead(head, {
      templateParams: { site: 'Docs' },
      script: [{ textContent: 'window.site = "%site"', processTemplateParams: true }],
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

    expect(contentOf(head, 'script')).toEqual(['window.site = "Docs"'])
  })

  it('renders the safe title only in display fields on the server', () => {
    const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
    useHead(head, { script: [{ textContent: 'window.t = "%pageTitle"', processTemplateParams: true }] })
    useHeadSafe(head, { title: HOSTILE })

    expect(renderSSRHead(head).headTags).toContain('<script>window.t = "%pageTitle"</script>')
  })
})
