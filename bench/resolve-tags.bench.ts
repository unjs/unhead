import { TemplateParamsPlugin } from 'unhead/plugins'
import { createHead, renderSSRHead } from 'unhead/server'
import { bench, describe } from 'vitest'

// resolve-heavy: many entries per head, per-request head creation (Nuxt-style).
// Isolates resolveTags allocation behavior with and without tag-mutating hooks.

function pushEntries(head: ReturnType<typeof createHead>, count: number) {
  head.push({
    title: 'Resolve Bench',
    titleTemplate: '%s %separator Unhead',
    templateParams: { separator: '·' },
  })
  for (let i = 0; i < count; i++) {
    head.push({
      meta: [
        { name: `description-${i}`, content: `Description ${i}` },
        { property: 'og:image', content: `/image-${i}.png` },
      ],
      link: [
        { rel: 'preload', as: 'script', href: `/_nuxt/chunk-${i}.js` },
      ],
      script: [
        { src: `/_nuxt/entry-${i}.js`, defer: true },
      ],
    })
  }
}

describe('resolveTags many entries', () => {
  bench('20 entries, no plugins', () => {
    const head = createHead()
    pushEntries(head, 20)
    renderSSRHead(head)
  })

  bench('20 entries, templateParams plugin', () => {
    const head = createHead({ plugins: [TemplateParamsPlugin] })
    pushEntries(head, 20)
    renderSSRHead(head)
  })

  bench('5 entries, no plugins', () => {
    const head = createHead()
    pushEntries(head, 5)
    renderSSRHead(head)
  })
})
