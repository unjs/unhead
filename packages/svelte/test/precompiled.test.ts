// @vitest-environment jsdom
import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import { cleanup, render } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { createHead as createNeutralHead, useHead as useNeutralHead, useSeoMeta as useNeutralSeoMeta } from '../src/precompiled'
import { createHead as createClientHead } from '../src/precompiled/client'
import { createHead as createCsrHead } from '../src/precompiled/client-csr'
import { createHead as createDeferredHead } from '../src/precompiled/client-deferred'
import { createHead as createServerHead, renderSSRHead, useHead as useServerHead, useSeoMeta as useServerSeoMeta } from '../src/precompiled/server'
import Precompiled from './fixtures/Precompiled.svelte'
import PrecompiledCsr from './fixtures/PrecompiledCsr.svelte'
import PrecompiledDeferred from './fixtures/PrecompiledDeferred.svelte'

const serverTitlePlan = [[10, 'title', '<title>Svelte</title>']] as const
const serverDescriptionPlan = [[100, 'meta:description', '<meta name="description" content="svelte description">']] as const

afterEach(() => cleanup())

describe('svelte precompiled adapters', () => {
  it('fails loudly when the neutral composables reach runtime', () => {
    expect(() => createNeutralHead()).toThrow('must be compiled by @unhead/bundler')
    expect(() => useNeutralHead({ title: 'uncompiled' }, { head: {} as any }))
      .toThrow('must be compiled by @unhead/bundler')
    expect(() => useNeutralSeoMeta({ description: 'uncompiled' }, { head: {} as any }))
      .toThrow('must be compiled by @unhead/bundler')
  })

  it('disposes client plans when the component is destroyed', () => {
    const head = createClientHead()
    const view = render(Precompiled, { props: { head } })

    expect(head._e.size).toBe(2)
    view.unmount()
    expect(head._e.size).toBe(0)
  })

  it('disposes SPA-only client plans when the component is destroyed', () => {
    document.head.innerHTML = '<meta name="ssr" content="untouched">'
    document.title = ''
    const head = createCsrHead()
    const view = render(PrecompiledCsr, { props: { head } })

    expect(head._e.size).toBe(2)
    expect(document.title).toBe('Svelte CSR')
    view.unmount()
    expect(head._e.size).toBe(0)
    expect(document.querySelector('meta[name="ssr"]')?.getAttribute('content')).toBe('untouched')
  })

  it('drops deferred plans when the component is destroyed before replay', async () => {
    document.title = 'SSR title'
    const head = createDeferredHead()
    const view = render(PrecompiledDeferred, { props: { head } })

    expect(document.title).toBe('SSR title')
    view.unmount()
    await head.ready
    expect(document.title).toBe('SSR title')
    expect(document.querySelector('meta[name="description"]')).toBeNull()
  })

  it('appends server plans without component cleanup', () => {
    const head = createServerHead({ disableDefaults: true })

    expect(useServerHead(serverTitlePlan as unknown as ResolvableHead, { head })).toBeUndefined()
    expect(useServerSeoMeta(serverDescriptionPlan as unknown as UseSeoMetaInput, { head })).toBeUndefined()

    expect(head._p).toHaveLength(2)
    expect(renderSSRHead(head).headTags).toBe('<title>Svelte</title><meta name="description" content="svelte description">')
  })
})
