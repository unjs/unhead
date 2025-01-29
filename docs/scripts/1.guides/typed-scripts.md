---
title: "Type-Safe Third Party Scripts"
description: "Add TypeScript support to any external JavaScript - from analytics to widgets"
---

Most third-party scripts have bad or no types. Here's how to fix that.

## Basic Types

```ts
const fathom = useScript<{ trackPageview: () => void }>('https://cdn.usefathom.com/script.js', {
  use() { 
    return window.fathom
  }
})

// Full autocomplete + type checking
fathom.proxy.trackPageview()
```

## Window Types

Better approach - augment the Window interface:

```ts
declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params: { [key: string]: any }
    ) => void
  }
}

const analytics = useScript('https://www.googletagmanager.com/gtag/js', {
  use() {
    return { gtag: window.gtag }
  }
})
```

## Common Mistakes

1. Don't type everything:
```ts
// Bad - way too much typing
interface ComplexScript {
  internal: { ... } // 100s of internal types
}

// Good - type only what you use
interface ComplexScript {
  track: (event: string) => void
}
```

2. Don't type dynamic values:
```ts
// Bad - these change often
interface BadAnalytics {
  version: string
  buildId: string
}

// Good - only type stable APIs
interface GoodAnalytics {
  track: (event: string) => void
}
```

## Real Examples

### Google Analytics

```ts
interface GA {
  gtag: (
    command: 'event' | 'config',
    target: string,
    params?: {
      page_title?: string
      page_path?: string
      [key: string]: any
    }
  ) => void
}

export function useGoogleAnalytics(id: string) {
  return useScript<GA>('https://www.googletagmanager.com/gtag/js', {
    beforeInit() {
      window.dataLayer = window.dataLayer || []
      window.gtag = function gtag() { dataLayer.push(arguments) }
      gtag('js', new Date())
      gtag('config', id)
    },
    use() {
      return { gtag: window.gtag }
    }
  })
}
```

### Crisp Chat

```ts
interface Crisp {
  push: (args: string[]) => void
  is: (state: string) => boolean
}

declare global {
  interface Window {
    $crisp: Crisp
  }
}

export function useCrispChat(websiteId: string) {
  return useScript<Crisp>('https://client.crisp.chat/l.js', {
    beforeInit() {
      window.$crisp = []
      window.CRISP_WEBSITE_ID = websiteId
    },
    use() {
      return window.$crisp
    }
  })
}
```

## External Resources

- [Understanding TypeScript's Global Types](https://www.typescriptlang.org/docs/handbook/declaration-files/by-example.html)
- [Google's Official gtag.js Types](https://developers.google.com/tag-platform/gtagjs/reference)
- [Creating .d.ts Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

## Next Steps

- [Control Loading →](/unhead/scripts/load-triggers)
- [Handle Errors →](/unhead/scripts/load-failures)
- [Use the Proxy API →](/unhead/scripts/proxy-api)
