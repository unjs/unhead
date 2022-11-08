import type { Head } from '@unhead/schema'
import { JSDOM } from 'jsdom'
import type { SSRHeadPayload } from '@unhead/ssr'

export function useDom(payload?: SSRHeadPayload, extra?: SSRHeadPayload) {
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

export const basicSchema: Head = {
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
}
