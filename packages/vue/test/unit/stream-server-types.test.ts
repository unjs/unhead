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
    // @ts-expect-error Valid fields do not make unknown fields legal
    head.push(() => ref({ title: 'Docs', invalid: true }))
    // @ts-expect-error The base href must be a string, including inside a ref
    head.push({ base: ref({ href: 42 }) })
    const entry = head.push({ title })
    // @ts-expect-error A computed entry returned by a getter still needs a string href
    entry.patch(() => computed(() => ({ base: { href: 42 } })))
    // @ts-expect-error Check the keys in a computed value returned by a getter
    entry.patch(() => computed(() => ({ title: 'Docs', invalid: true })))

    const enabled = ref(true)
    const page = ref({ title: 'Docs' })
    const section = computed(() => ({ base: { href: '/docs/' } }))
    head.push(() => enabled.value ? page : section)
    const input: Parameters<typeof head.push>[0] = enabled.value ? page : () => section
    head.push(input)
    head.push(null)
    entry.patch(undefined)
    entry.patch(() => enabled.value ? page : false)
    const invalidSection = computed(() => ({ base: { href: '/docs/' }, invalid: true }))
    // @ts-expect-error Every branch of the getter must have valid keys
    entry.patch(() => enabled.value ? page : invalidSection)
  })

  it('checks keys on nested tag objects through refs and computed values', () => {
    const { head } = createStreamableHead()
    const meta = ref({ name: 'description', content: 'Docs' })
    const entry = head.push(() => computed(() => ({
      meta: [meta],
      htmlAttrs: { 'data-section': 'docs', 'style': { color: 'red' } },
      templateParams: { custom: 'Docs' },
    })))
    const canonical = ref({ rel: 'canonical', href: '/docs/' } as const)
    entry.patch({ link: computed(() => [canonical]) })

    // @ts-expect-error Check attributes on tags in a getter's returned ref
    head.push(() => ref({ meta: [{ name: 'description', content: 'Docs', invalid: true }] }))
    // @ts-expect-error Check attributes on a computed singleton tag
    entry.patch({ base: computed(() => ({ href: '/docs/', invalid: true })) })
    const invalidLink = ref({ rel: 'canonical', href: '/docs/', invalid: true } as const)
    // @ts-expect-error Check ref elements inside computed tag arrays
    entry.patch({ link: computed((): [typeof canonical, typeof invalidLink] => [canonical, invalidLink]) })
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
