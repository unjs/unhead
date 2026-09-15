import { FlatMetaPlugin, TemplateParamsPlugin } from 'unhead/plugins'
import { createHead } from 'unhead/server'
import { describe, it } from 'vitest'

// Resolve-heavy first and cached renders with many entries per head.
// Covers Nuxt-style per-request creation and tag-mutating plugin hooks.
const benchPlugins = {
  flatMeta: FlatMetaPlugin,
  templateParams: TemplateParamsPlugin,
}

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

function createBenchHead(count: number, plugin?: keyof typeof benchPlugins) {
  const head = createHead({
    plugins: plugin ? [benchPlugins[plugin]] : [],
  })
  pushEntries(head, count)
  return head
}

describe('resolveTags many entries, first render', () => {
  it('20 entries, no plugins', async ({ bench }) => {
    await bench('20 entries, no plugins', () => {
      createBenchHead(20).render()
    }).run()
  })

  it('20 entries, templateParams plugin', async ({ bench }) => {
    await bench('20 entries, templateParams plugin', () => {
      createBenchHead(20, 'templateParams').render()
    }).run()
  })

  it('20 entries, flatMeta plugin', async ({ bench }) => {
    await bench('20 entries, flatMeta plugin', () => {
      createBenchHead(20, 'flatMeta').render()
    }).run()
  })

  it('5 entries, no plugins', async ({ bench }) => {
    await bench('5 entries, no plugins', () => {
      createBenchHead(5).render()
    }).run()
  })
})

describe('resolveTags many entries, cached render', () => {
  const noPlugins = createBenchHead(20)
  const templateParams = createBenchHead(20, 'templateParams')
  const flatMeta = createBenchHead(20, 'flatMeta')
  noPlugins.render()
  templateParams.render()
  flatMeta.render()

  it('20 entries, no plugins', async ({ bench }) => {
    await bench('20 entries, no plugins', () => {
      noPlugins.render()
    }).run()
  })

  it('20 entries, templateParams plugin', async ({ bench }) => {
    await bench('20 entries, templateParams plugin', () => {
      templateParams.render()
    }).run()
  })

  it('20 entries, flatMeta plugin', async ({ bench }) => {
    await bench('20 entries, flatMeta plugin', () => {
      flatMeta.render()
    }).run()
  })
})
