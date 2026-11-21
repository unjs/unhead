import { createStreamableHead, renderSSRHeadShell } from '@unhead/vue/stream/server'
import { defineLink } from 'unhead'
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
    const titleWithExtra = { textContent: 'Docs', value: 'unexpected' }
    // @ts-expect-error A ref implementation key is not a title attribute
    entry.patch(() => ref({ title: titleWithExtra }))
    // @ts-expect-error Check attributes on a computed singleton tag
    entry.patch({ base: computed(() => ({ href: '/docs/', invalid: true })) })
    const invalidLink = ref({ rel: 'canonical', href: '/docs/', invalid: true } as const)
    // @ts-expect-error Check ref elements inside computed tag arrays
    entry.patch({ link: computed((): [typeof canonical, typeof invalidLink] => [canonical, invalidLink]) })
  })

  it('renders custom defineLink relations through reactive entries', async () => {
    const { head } = createStreamableHead()
    const discovery = defineLink({ rel: 'EditURI', href: '/rsd.xml', type: 'application/rsd+xml' })
    const canonical = ref({ rel: 'canonical', href: '/docs/' } as const)
    const entry = head.push(() => ref({ link: [discovery] }))
    entry.patch({ link: computed(() => [canonical, discovery]) })

    const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
    expect(shell).toContain('<link rel="EditURI" href="/rsd.xml" type="application/rsd+xml">')
    expect(shell).toContain('<link rel="canonical" href="/docs/">')
  })

  it('checks attributes against the known relations a variable can hold', () => {
    const { head } = createStreamableHead()
    const configured = ref<string>('canonical')
    const ordinary = defineLink({ rel: configured.value, href: '/docs/' })
    const entry = head.push(() => ref({ link: [ordinary] }))
    const unsafe = defineLink({ rel: configured.value, href: '/docs/', as: 'image' })
    // @ts-expect-error A string relation can resolve to a link that forbids as
    entry.patch({ link: computed(() => [unsafe]) })
    // @ts-expect-error Adding a preload attribute after defineLink still needs a known variant
    entry.patch({ link: [{ ...ordinary, as: 'image' as const }] })

    const custom = ref('EditURI' as const)
    entry.patch({ link: [defineLink({ rel: custom.value, href: '/rsd.xml', type: 'application/rsd+xml' })] })
    const maybeCustom = computed(() => configured.value === 'canonical' ? 'canonical' as const : 'EditURI' as const)
    const shared = defineLink({ rel: maybeCustom.value, href: '/rsd.xml' })
    entry.patch({ link: [shared] })
    // @ts-expect-error Spreading a link preserves the possible known relations
    entry.patch({ link: [{ ...shared, type: 'application/rsd+xml' }] })
    const unsafeUnion = defineLink({ rel: maybeCustom.value, href: '/rsd.xml', type: 'application/rsd+xml' })
    // @ts-expect-error The canonical alternative forbids type
    head.push(() => ref({ link: [unsafeUnion] }))
    const maybePreload = computed(() => configured.value === 'preload' ? 'preload' as const : 'EditURI' as const)
    // @ts-expect-error The preload alternative needs as
    defineLink({ rel: maybePreload.value, href: '/docs.png' })
    entry.patch({ link: [defineLink({ rel: maybePreload.value, href: '/docs.png', as: 'image', imagesrcset: '/docs.png 1x' })] })
  })

  it('renders valid reactive link variants', async () => {
    const { head } = createStreamableHead()
    const canonical = ref({ rel: 'canonical', href: '/docs/' } as const)
    const imagePreload = computed(() => ({
      rel: ref('preload' as const),
      as: computed(() => 'image' as const),
      imagesrcset: '/docs.png 1x',
    }))
    const entry = head.push(() => computed(() => ({ link: [canonical, imagePreload] })))
    entry.patch(() => ref({ link: [canonical, imagePreload] }))
    const inferredLinks = computed(() => [
      { rel: 'canonical' as const, href: '/docs/' },
      { rel: 'preload' as const, as: 'image' as const, imagesrcset: '/docs.png 1x' },
    ])
    entry.patch({ link: inferredLinks })
    const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
    expect(shell).toContain('<link rel="canonical" href="/docs/">')
    expect(shell).toContain('<link rel="preload" as="image" imagesrcset="/docs.png 1x">')
  })

  it('rejects attributes from a different link variant', () => {
    const { head } = createStreamableHead()
    const entry = head.push({})
    const canonicalWithPreloadAttrs = ref({ rel: 'canonical', href: '/docs/', as: 'image' } as const)
    // @ts-expect-error Canonical links cannot use the preload as attribute
    head.push(() => ref({ link: [canonicalWithPreloadAttrs] }))
    const custom = defineLink({ rel: 'EditURI', href: '/rsd.xml', type: 'application/rsd+xml' })
    // @ts-expect-error A custom relation cannot hide an invalid canonical link in the same array
    entry.patch({ link: computed(() => [custom, canonicalWithPreloadAttrs]) })
    const canonicalWithType = { ...custom, rel: 'canonical' as const }
    // @ts-expect-error Changing the relation restores the canonical variant's attribute rules
    entry.patch({ link: [canonicalWithType] })
    const canonicalOrAuthor = ref(false)
    const knownRelation = canonicalOrAuthor.value ? 'canonical' : 'author'
    const knownLink = defineLink({ rel: knownRelation, href: '/docs/' })
    entry.patch({ link: [knownLink] })
    const knownLinkWithPreloadAttr = defineLink({ rel: knownRelation, href: '/docs/', as: 'image' })
    // @ts-expect-error Both possible relations forbid the preload attribute
    entry.patch({ link: [knownLinkWithPreloadAttr] })

    const preload = ref(false)
    const conditionalAs = computed(() => ({ rel: 'canonical', href: '/docs/', as: preload.value ? 'image' : undefined } as const))
    // @ts-expect-error A canonical link might supply a preload attribute
    entry.patch({ link: [conditionalAs] })

    const scriptWithImageAttrs = computed(() => ({ rel: 'preload', as: 'script', href: '/docs.js', imagesrcset: '/docs.png 1x' } as const))
    // @ts-expect-error A script preload cannot use the image preload imagesrcset attribute
    entry.patch({ link: computed(() => [scriptWithImageAttrs]) })
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
