import { createStreamableHead, renderSSRHeadShell } from '@unhead/vue/stream/server'
import { computed, ref } from 'vue'

describe('vue streaming server types', () => {
  it('accepts reactive head entries and rejects unknown head fields', () => {
    const { head } = createStreamableHead()
    const title = ref('Reactive title')

    head.push({ title })
    head.push({ templateParams: ref({ separator: '|' }) })
    head.push(ref({ title: title.value }))
    head.push(computed(() => ({ title: title.value })))

    // @ts-expect-error Unknown head fields are invalid
    head.push({ title, invalid: true })
    // @ts-expect-error A ref still needs a valid head entry
    head.push(ref({ invalid: true }))
    // @ts-expect-error A getter returning a ref still needs a valid head entry
    head.push(() => ref({ invalid: true }))
    // @ts-expect-error The base href must be a string, including inside a ref
    head.push({ base: ref({ href: 42 }) })
    const entry = head.push({ title })
    // @ts-expect-error A computed entry returned by a getter still needs a string href
    entry.patch(() => computed(() => ({ base: { href: 42 } })))
  })

  it('renders head entry getters that return refs and computed values', async () => {
    const { head } = createStreamableHead()
    const title = ref({ title: 'Vue Streaming' })
    const base = computed(() => ({ base: { href: '/docs/' } }))

    head.push(() => title)
    const entry = head.push({ base: { href: '/' } })
    entry.patch(() => base)

    const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

    expect(shell).toContain('<title>Vue Streaming</title>')
    expect(shell).toContain('<base href="/docs/">')
  })

  it('renders refs and computed values around whole tag objects', async () => {
    const { head } = createStreamableHead()
    const base = ref({ href: '/docs/' })
    const htmlAttrs = computed(() => ({ lang: 'en' }))
    const bodyAttrs = ref({ class: 'dark' })
    const title = computed(() => ({ textContent: 'Vue Streaming' }))
    const titleTemplate = computed(() => ({ textContent: '%s | Docs' }))
    const entry = head.push({ base })

    entry.patch({ base, htmlAttrs, bodyAttrs, title, titleTemplate })

    const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

    expect(shell).toContain('<base href="/docs/">')
    expect(shell).toContain('<html lang="en">')
    expect(shell).toContain('<body class="dark">')
    expect(shell).toContain('<title>Vue Streaming | Docs</title>')
  })

  it('renders singleton tag getters and title template callbacks', async () => {
    const { head } = createStreamableHead()
    head.push({ base: () => ({ href: '/docs/' }), title: 'Vue', titleTemplate: title => `${title} | Docs` })

    const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

    expect(shell).toContain('<base href="/docs/">')
    expect(shell).toContain('<title>Vue | Docs</title>')
  })
})
