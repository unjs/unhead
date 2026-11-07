import { useCompiledHead } from '@unhead/vue/compiled/client'
import { createLazyHead, lazyTemplateParams } from '@unhead/vue/lazy'

// compiled.ts with template params, which load only once a value holds `%`
const compiledTags = [
  ['title', 0, 10, 'title', { textContent: 'Test' }, 1],
  ['titleTemplate', 0, 100, 'titleTemplate', { textContent: '%s %separator %siteName' }, 1],
  ['templateParams', { siteName: 'Site' }, 100, 'templateParams', 0, 1],
  ['meta', { name: 'description', content: 'Test' }, 100, 'meta:description', 0, 1],
  ['link', { rel: 'icon', href: '/favicon.ico' }, 100, 'link:icon:/favicon.ico', 0, 1],
  ['script', { src: '/test.js', defer: true }, 80, 'script:defer:true,src:/test.js'],
] as const

const head = createLazyHead({ plugins: [lazyTemplateParams] })

useCompiledHead(compiledTags as any, undefined, { head })
