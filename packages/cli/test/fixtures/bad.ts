// @ts-nocheck
useHead({
  title: 'Hello <b>world</b>',
  meta: [
    { name: 'twitter:site', content: 'harlan_zw' },
    { name: 'robots', content: 'index, noindex' },
  ],
  script: [
    { src: '/x.js', type: 'module', defer: true },
  ],
  link: [
    { rel: 'preload', href: '/f.woff2', as: 'font' },
    { rel: 'canonical', href: '/about' },
  ],
})
