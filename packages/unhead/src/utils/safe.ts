import type { HeadSafe, MaybeArray } from '../types'

const WhitelistAttributes = {
  htmlAttrs: ['id', 'class', 'lang', 'dir'],
  bodyAttrs: ['id', 'class'],
  meta: ['id', 'name', 'property', 'charset', 'content'],
  noscript: ['id', 'textContent'],
  script: ['id', 'type', 'textContent'],
  link: ['id', 'color', 'crossorigin', 'fetchpriority', 'href', 'hreflang', 'imagesrcset', 'imagesizes', 'integrity', 'media', 'referrerpolicy', 'rel', 'sizes', 'type'],
}

function acceptDataAttrs(value: Record<string, string>) {
  const filtered: Record<string, string> = {}
  // add any data attributes
  Object.keys(value || {})
    .filter(a => a.startsWith('data-'))
    .forEach((a) => {
      filtered[a] = value[a]
    })
  return filtered
}

export function whitelistSafeInput(input: Record<string, MaybeArray<Record<string, string>>>): HeadSafe {
  const filtered: Record<string, MaybeArray<Record<string, string>>> = {}
  // remove any keys that can be used for XSS
  Object.keys(input).forEach((key) => {
    const tagValue = input[key]
    if (!tagValue)
      return
    switch (key as keyof HeadSafe) {
      // always safe
      case 'title':
      case 'titleTemplate':
      case 'templateParams':
        filtered[key] = tagValue
        break
      case 'htmlAttrs':
      case 'bodyAttrs':
        filtered[key] = acceptDataAttrs(tagValue as Record<string, string>)
        // @ts-expect-error untyped
        WhitelistAttributes[key].forEach((a) => {
          // @ts-expect-error untyped
          if (tagValue[a])
            // @ts-expect-error untyped
            filtered[key][a] = tagValue[a]
        })
        break
      // meta is safe, except for http-equiv
      case 'meta':
        if (Array.isArray(tagValue)) {
          filtered[key] = (tagValue as Record<string, string>[])
            .map((meta) => {
              const safeMeta: Record<string, string> = acceptDataAttrs(meta)
              WhitelistAttributes.meta.forEach((key) => {
                if (meta[key])
                  safeMeta[key] = meta[key]
              })
              return safeMeta
            })
            .filter(meta => Object.keys(meta).length > 0)
        }
        break
      // link tags we don't allow stylesheets, scripts, preloading, prerendering, prefetching, etc
      case 'link':
        if (Array.isArray(tagValue)) {
          filtered[key] = (tagValue as Record<string, string>[])
            .map((meta) => {
              const link: Record<string, string> = acceptDataAttrs(meta)
              WhitelistAttributes.link.forEach((key) => {
                const val = meta[key]
                // block bad rel types
                if (key === 'rel' && (val === 'stylesheet' || val === 'canonical' || val === 'modulepreload' || val === 'prerender' || val === 'preload' || val === 'prefetch'))
                  return

                if (key === 'href') {
                  if (val.includes('javascript:') || val.includes('data:'))
                    return
                  link[key] = val
                }
                else if (val) {
                  link[key] = val
                }
              })
              return link
            })
            .filter(link => Object.keys(link).length > 1 && !!link.rel)
        }
        break
      case 'noscript':
        if (Array.isArray(tagValue)) {
          filtered[key] = (tagValue as Record<string, string>[])
            .map((meta) => {
              const noscript: Record<string, string> = acceptDataAttrs(meta)
              WhitelistAttributes.noscript.forEach((key) => {
                if (meta[key])
                  noscript[key] = meta[key]
              })
              return noscript
            })
            .filter(meta => Object.keys(meta).length > 0)
        }
        break
      // we only allow JSON in scripts
      case 'script':
        if (Array.isArray(tagValue)) {
          filtered[key] = (tagValue as Record<string, string>[])
            .map((script) => {
              const safeScript: Record<string, string> = acceptDataAttrs(script)
              WhitelistAttributes.script.forEach((s) => {
                if (script[s]) {
                  if (s === 'textContent') {
                    try {
                      const jsonVal = typeof script[s] === 'string' ? JSON.parse(script[s]) : script[s]
                      safeScript[s] = JSON.stringify(jsonVal, null, 0)
                    }
                    catch {}
                  }
                  else {
                    safeScript[s] = script[s]
                  }
                }
              })
              return safeScript
            })
            .filter(meta => Object.keys(meta).length > 0)
        }
        break
    }
  })
  return filtered as HeadSafe
}
