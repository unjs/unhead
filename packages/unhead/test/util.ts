import type { CreateHeadOptions, ResolvableHead, SerializableHead, SSRHeadPayload, Unhead } from '../src/types'
import { JSDOM } from 'jsdom'
import { createHead as createClientHead } from '../src/client'
import { createHead as createServerHead } from '../src/server'

export function createClientHeadWithContext(resolvedOptions: CreateHeadOptions = {}) {
  return createClientHead(resolvedOptions)
}

export function createServerHeadWithContext(resolvedOptions: CreateHeadOptions = {}): Unhead<ResolvableHead> {
  return createServerHead({
    disableDefaults: true,
    ...resolvedOptions,
  })
}

// eslint-disable-next-line import/no-mutable-exports
export let activeDom: JSDOM | null = null

export function useDom(payload?: Partial<SSRHeadPayload>, extra?: Partial<SSRHeadPayload>) {
  if (typeof window !== 'undefined') {
    // reset window
    const window = new JSDOM().window
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

export const basicSchema: SerializableHead = {
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

export function useDOMHead(options: CreateHeadOptions = {}) {
  activeDom = useDom()
  return createClientHeadWithContext({
    document: activeDom.window.document,
    ...options,
  })
}

export function useDelayedSerializedDom() {
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(activeDom!.serialize()), 250)
  })
}
