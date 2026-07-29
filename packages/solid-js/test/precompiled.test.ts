// @vitest-environment jsdom
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createHead as createNeutralHead, useHead as useNeutralHead, useSeoMeta as useNeutralSeoMeta } from '../src/precompiled'
import { createHead as createClientHead, useHead as useClientHead, useSeoMeta as useClientSeoMeta } from '../src/precompiled/client'
import { createHead as createCsrHead, useHead as useCsrHead, useSeoMeta as useCsrSeoMeta } from '../src/precompiled/client-csr'
import { createHead as createDeferredHead, useHead as useDeferredHead, useSeoMeta as useDeferredSeoMeta } from '../src/precompiled/client-deferred'
import { createHead as createServerHead, renderSSRHead, useHead as useServerHead, useSeoMeta as useServerSeoMeta } from '../src/precompiled/server'

const titlePlan = [[10, 'title', 'title', {}, 'Solid']] as const
const descriptionPlan = [[100, 'meta:description', 'meta', { name: 'description', content: 'solid description' }]] as const
const serverTitlePlan = [[10, 'title', '<title>Solid</title>']] as const
const serverDescriptionPlan = [[100, 'meta:description', '<meta name="description" content="solid description">']] as const

describe('solid precompiled adapters', () => {
  it('fails loudly when the neutral composables reach runtime', () => {
    expect(() => createNeutralHead()).toThrow('must be compiled by @unhead/bundler')
    expect(() => useNeutralHead({ title: 'uncompiled' }, { head: {} as any }))
      .toThrow('must be compiled by @unhead/bundler')
    expect(() => useNeutralSeoMeta({ description: 'uncompiled' }, { head: {} as any }))
      .toThrow('must be compiled by @unhead/bundler')
  })

  it('disposes client plans with their Solid owner', () => {
    const head = createClientHead()
    let dispose!: () => void

    createRoot((ownerDispose) => {
      dispose = ownerDispose
      useClientHead(titlePlan as unknown as ResolvableHead, { head })
      useClientSeoMeta(descriptionPlan as unknown as UseSeoMetaInput, { head })
    })

    expect(head._e.size).toBe(2)
    dispose()
    expect(head._e.size).toBe(0)
  })

  it('disposes SPA-only client plans with their Solid owner', () => {
    document.head.innerHTML = '<meta name="ssr" content="untouched">'
    document.title = ''
    const head = createCsrHead()
    let dispose!: () => void

    createRoot((ownerDispose) => {
      dispose = ownerDispose
      useCsrHead(titlePlan as unknown as ResolvableHead, { head })
      useCsrSeoMeta(descriptionPlan as unknown as UseSeoMetaInput, { head })
    })

    expect(head._e.size).toBe(2)
    expect(document.title).toBe('Solid')
    dispose()
    expect(head._e.size).toBe(0)
    expect(document.querySelector('meta[name="ssr"]')?.getAttribute('content')).toBe('untouched')
  })

  it('drops deferred plans when their Solid owner is disposed before replay', async () => {
    document.title = 'SSR title'
    const head = createDeferredHead()
    let dispose!: () => void

    createRoot((ownerDispose) => {
      dispose = ownerDispose
      useDeferredHead(titlePlan as unknown as ResolvableHead, { head })
      useDeferredSeoMeta(descriptionPlan as unknown as UseSeoMetaInput, { head })
    })

    expect(document.title).toBe('SSR title')
    dispose()
    await head.ready
    expect(document.title).toBe('SSR title')
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })

  it('appends server plans without registering owner cleanup', () => {
    const head = createServerHead({ disableDefaults: true })
    let dispose!: () => void

    createRoot((ownerDispose) => {
      dispose = ownerDispose
      expect(useServerHead(serverTitlePlan as unknown as ResolvableHead, { head })).toBeUndefined()
      expect(useServerSeoMeta(serverDescriptionPlan as unknown as UseSeoMetaInput, { head })).toBeUndefined()
    })

    dispose()
    expect(head._p).toHaveLength(2)
    expect(renderSSRHead(head).headTags).toBe('<title>Solid</title><meta name="description" content="solid description">')
  })
})
