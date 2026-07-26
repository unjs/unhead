import type { ResolvableHead } from '../../../src/types'
import { describe, it } from 'vitest'
import { renderSSRHead } from '../../../src/server'
import { resolveTags } from '../../../src/utils/resolve'
import { createServerHeadWithContext } from '../../util'

describe('ssr innerHTML', () => {
  it('json', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          innerHTML: {
            test: 'test',
            something: {
              else: 123,
            },
          },
        },
      ],
    })
    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script type="application/json">{"test":"test","something":{"else":123}}</script>",
        "htmlAttrs": "",
      }
    `)
  })

  it('json escaping', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          type: 'application/json',
          innerHTML: {
            escape: '</script>',
          },
        },
      ],
    })
    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script type="application/json">{"escape":"\\u003C/script>"}</script>",
        "htmlAttrs": "",
      }
    `)
  })

  it('serializes Nuxt noScripts speculation rules', () => {
    const head = createServerHeadWithContext()
    const rules = ['/about', '/products/*'].map(href_matches => ({
      where: { href_matches },
      eagerness: 'moderate',
    }))
    head.push({
      script: [{
        type: 'speculationrules',
        innerHTML: {
          prefetch: rules,
          prerender: rules,
        },
      }],
    })

    expect(renderSSRHead(head).headTags).toBe('<script type="speculationrules">{"prefetch":[{"where":{"href_matches":"/about"},"eagerness":"moderate"},{"where":{"href_matches":"/products/*"},"eagerness":"moderate"}],"prerender":[{"where":{"href_matches":"/about"},"eagerness":"moderate"},{"where":{"href_matches":"/products/*"},"eagerness":"moderate"}]}</script>')
  })

  it('noscript', async () => {
    const head = createServerHeadWithContext()
    head.push({
      noscript: [
        {
          innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    })
    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
          height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>",
        "htmlAttrs": "",
      }
    `)
  })

  it('bug #228', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [{
        innerHTML: `/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck

(() => {
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
  const setting = localStorage.getItem('vueuse-color-scheme') || 'auto'
  if (setting === 'dark' || (prefersDark && setting !== 'light'))
    document.documentElement.classList.toggle('dark', true)
})()`,
        // @ts-expect-error untyped
        once: true,
      }],
    } satisfies ResolvableHead)

    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script once>/* eslint-disable */
      /* prettier-ignore */
      // @ts-nocheck

      (() => {
        const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
        const setting = localStorage.getItem('vueuse-color-scheme') || 'auto'
        if (setting === 'dark' || (prefersDark && setting !== 'light'))
          document.documentElement.classList.toggle('dark', true)
      })()</script>",
        "htmlAttrs": "",
      }
    `)
  })

  it('empty innerHTML', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          innerHTML: '',
        },
      ],
    })
    expect(resolveTags(head)).toMatchInlineSnapshot('[]')
  })
})
