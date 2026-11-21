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
    // @ts-expect-error The base href must be a string, including inside a ref
    head.push({ base: ref({ href: 42 }) })
  })

  it('renders refs and computed values around whole tag objects', async () => {
    const { head } = createStreamableHead()
    const base = ref({ href: '/docs/' })
    const htmlAttrs = computed(() => ({ lang: 'en' }))
    const bodyAttrs = ref({ class: 'dark' })
    const title = computed(() => ({ textContent: 'Vue Streaming' }))
    const entry = head.push({ base })

    entry.patch({ base, htmlAttrs, bodyAttrs, title })

    const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

    expect(shell).toContain('<base href="/docs/">')
    expect(shell).toContain('<html lang="en">')
    expect(shell).toContain('<body class="dark">')
    expect(shell).toContain('<title>Vue Streaming</title>')
  })
})
