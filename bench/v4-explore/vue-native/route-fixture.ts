/** Shared nav workload: 1 layout entry (6 tags) + 1 route entry (6 tags). */

export const LAYOUT = {
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'stylesheet', href: '/entry.css' },
    { rel: 'preload', as: 'script', href: '/_nuxt/app.js' },
  ],
  script: [{ 'src': 'https://analytics.example.com/s.js', 'defer': true, 'key': 'analytics', 'data-site': 'X' }],
  meta: [{ name: 'robots', content: 'index, follow' }],
}

export function routeEntry(i: number) {
  return {
    title: `Page ${i}`,
    meta: [
      { name: 'description', content: `All about page ${i}.` },
      { property: 'og:title', content: `Page ${i}` },
      { property: 'og:url', content: `https://x.com/p/${i}` },
      { property: 'og:image', content: `https://x.com/og/${i}.png` },
    ],
    link: [{ rel: 'canonical', href: `https://x.com/p/${i}` }],
  }
}
