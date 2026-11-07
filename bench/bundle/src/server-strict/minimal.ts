import { createHead, renderSSRHead } from 'unhead/compiled/server-strict'

// compileTags() output for the input in the v3 fixture of this bundle
const compiledTags = [
  ['title', 0, 10, 'title', { textContent: 'Test' }, 1],
  ['titleTemplate', 0, 100, 'titleTemplate', { textContent: '%s | Site' }, 1],
  ['meta', { name: 'description', content: 'Test' }, 100, 'meta:description', 0, 1],
  ['link', { rel: 'icon', href: '/favicon.ico' }, 100, 'link:icon:/favicon.ico', 0, 1],
  ['script', { src: '/test.js', defer: true }, 80, 'script:defer:true,src:/test.js'],
] as const

async function doHead() {
  const head = createHead()

  head.push(compiledTags as any)

  return renderSSRHead(head)
}

doHead()
