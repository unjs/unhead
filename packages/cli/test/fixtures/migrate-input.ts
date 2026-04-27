// @ts-nocheck
useHead({
  script: [
    { children: 'console.log(1)' },
    { src: '/x.js', body: true },
    { src: '/m.js', type: 'module', defer: true },
  ],
  meta: [
    { hid: 'desc', name: 'description', content: 'x' },
    { name: 'twitter:site', content: 'unjsio' },
  ],
  link: [
    { rel: 'preload', href: '/f.woff2', as: 'font' },
  ],
})
