::code-group

```ts [useHead]
// all the goodies
useHead({
  // Titles
  title: 'Hello World',
  titleTemplate: '%s %separator %siteName',
  // Template params
  templateParams: { separator: '|', siteName: 'My App' },
  // Classes
  bodyAttrs: { class: { overflow: true } },
  // Deduping
  script: [{ key: '123', src: '/script.js' }],
})
```

```ts [useServerHead]
// server only head tags for improved performance
useServerHead({
  link: [
    {
      // promises supported
      href: import('~/assets/MyFont.css?url'),
      rel: 'stylesheet',
      type: 'text/css'
    }
  ]
})
```


```ts [useSeoMeta]
// the easiest meta tags
useSeoMeta({
  charset: 'utf-8',
  description: 'Welcome to my site',
  ogImage: 'https://example.com/image.jpg',
  ogLocale: 'en',
  ogLocaleAlternate: ['fr', 'zh'],
})
```

```ts [DOM events]
// DOM events right in your head that _just work_
useHead({
  script: [
    {
      // async prop support
      src: './script.js',
      // dom handlers
      onload: () => alert('woo'),
    },
  ],
  htmlAttrs: { onclick: () => alert('just works') },
})
```

```ts [useSchemaOrg]
// schema.org graphs as simple as it gets
useSchemaOrg([
  defineWebPage(),
  defineWebSite({
    name: 'My Awesome Website',
  }),
  defineOrganization({
    name: 'Acme Corp',
  }),
])
```

::
