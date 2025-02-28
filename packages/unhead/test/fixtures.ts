import type { SSRHeadPayload } from '@unhead/ssr'
import type { ResolvableHead } from '../src/types'
import { JSDOM } from 'jsdom'

export function useDom(payload?: Partial<SSRHeadPayload>, extra?: Partial<SSRHeadPayload>) {
  if (typeof window !== 'undefined') {
    // just apply the below to the current document
    const attrsString = `${extra?.htmlAttrs || ''}${payload?.htmlAttrs || ''}`
    // split into key => value
    const attrsObj = attrsString.split(' ').reduce((acc, attr) => {
      const [key, value] = attr.split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
    Object.entries(attrsObj).forEach(([key, value]) => {
      if (key.length) {
        window.document.documentElement.setAttribute(key, String(value).replaceAll('"', ''))
      }
    })
    window.document.documentElement.innerHTML = `<head>
${payload?.headTags || ''}
</head>
<body ${extra?.bodyAttrs || ''} ${payload?.bodyAttrs || ''}>
${payload?.bodyTagsOpen || ''}
<div>
<h1>hello world</h1>
</div>
${payload?.bodyTags || ''}
</body>
`
    return {
      window,
      serialize: () => window.document.documentElement.outerHTML,
    } as any as JSDOM
  }
  return new JSDOM(
    `<!DOCTYPE html>
<html ${extra?.htmlAttrs || ''}${payload?.htmlAttrs || ''}>
<head>
${payload?.headTags || ''}
</head>
<body ${extra?.bodyAttrs || ''} ${payload?.bodyAttrs || ''}>
${payload?.bodyTagsOpen || ''}
<div>
<h1>hello world</h1>
</div>
${payload?.bodyTags || ''}
</body>
</html>
`,
  )
}

export const basicSchema = {
  htmlAttrs: {
    lang: 'en',
    dir: 'ltr',
  },
  bodyAttrs: {
    class: 'dark',
  },
  script: [
    {
      src: 'https://cdn.example.com/script.js',
    },
  ],
  meta: [
    {
      charset: 'utf-8',
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: 'https://cdn.example.com/favicon.ico',
    },
  ],
} satisfies ResolvableHead
