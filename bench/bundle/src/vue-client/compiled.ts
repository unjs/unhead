import { useCompiledHead } from '@unhead/vue/compiled/client'
import { createLazyHead } from '@unhead/vue/lazy'

// compileTags() output for the input of minimal.ts, so the total compares directly with Vue Client (Minimal)
const compiledTags = [
  ['title', 0, 10, 'title', { textContent: 'Test' }, 1],
  ['titleTemplate', 0, 100, 'titleTemplate', { textContent: '%s | Site' }, 1],
  ['meta', { name: 'description', content: 'Test' }, 100, 'meta:description', 0, 1],
  ['link', { rel: 'icon', href: '/favicon.ico' }, 100, 'link:icon:/favicon.ico', 0, 1],
  ['script', { src: '/test.js', defer: true }, 80, 'script:defer:true,src:/test.js'],
] as const

const head = createLazyHead()

useCompiledHead(compiledTags as any, undefined, { head })
