import { describe, expect, it } from 'vitest'
import { collectHeadUsage } from '../src/unplugin/clientHeadUsage'

describe('collectHeadUsage', () => {
  it('finds a named vendor alias and its static title template', () => {
    const usage = collectHeadUsage(`
import { useHead as useVendorHead } from '@unhead/vue'
useVendorHead({ titleTemplate: '%s | Vendor' })
`, '/app/node_modules/example/dist/index.mjs')
    expect(usage).toEqual({ domEvents: false, titleTemplate: true })
  })

  it('uses the second argument for the core composable', () => {
    const usage = collectHeadUsage(`
import { useHead as addHead } from 'unhead'
addHead(head, { bodyAttrs: { onresize() {} } })
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: true, titleTemplate: false })
  })

  it('finds a vendor title template passed to the Nuxt composable', () => {
    const usage = collectHeadUsage(`
import { useHead } from 'nuxt/app'
useHead({ titleTemplate: () => '%s | Site' })
`, '/app/node_modules/nuxt-seo-utils/dist/runtime/app/logic/applyDefaults.js')
    expect(usage).toEqual({ domEvents: false, titleTemplate: true })
  })

  it('keeps features for a composable re-exported by a vendor', () => {
    const usage = collectHeadUsage(`
import { useHead as add } from 'vendor/nuxt'
import * as core from 'vendor/core'
add({ titleTemplate: '%s | Vendor' })
core.useHead(head, { bodyAttrs: { onresize } })
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: true, titleTemplate: true })
  })

  it('recognizes the resolved Nuxt composable in compiled Vue scripts', () => {
    const usage = collectHeadUsage(`
import { useHead as useNuxtHead } from '/app/node_modules/nuxt/dist/head/runtime/composables.js'
useNuxtHead(() => ({ titleTemplate: (title) => title, script: [{ onload }] }))
`, '/app/pages/index.vue?vue&type=script&setup=true&lang.ts')
    expect(usage).toEqual({ domEvents: true, titleTemplate: true })
  })

  it('recognizes an auto-import and statically named computed keys', () => {
    const usage = collectHeadUsage(`
useHead({ ['titleTemplate']: '%s | Site', bodyAttrs: { ['onresize']: resize } })
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: true, titleTemplate: true })
  })

  it('follows a namespace alias and a const input in its original scope', () => {
    const usage = collectHeadUsage(`
import * as headRuntime from '@unhead/vue'
const add = headRuntime.useHead
const defaults = { titleTemplate: '%s | Site' }
const input = defaults
function render() {
  const defaults = {}
  add(input)
}
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: false, titleTemplate: true })
  })

  it('follows static return branches for function inputs', () => {
    const usage = collectHeadUsage(`
import { useHead } from '#imports'
useHead(() => {
  if (subject)
    return { titleTemplate: '%s | Site' }
  return { link: [{ href: '/app.css', onload }] }
})
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: true, titleTemplate: true })
  })

  it('ignores dynamic keys, unresolved spreads, and event names inside nested data', () => {
    const usage = collectHeadUsage(`
import { useHead } from '@unhead/vue'
useHead({
  [titleKey]: '%s | Site',
  ...unknownInput,
  bodyAttrs: { [eventKey]: onresize, class: { onboard: true } },
  templateParams: { titleTemplate: 'value' },
})
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: false, titleTemplate: false })
  })

  it('ignores words found outside useHead and bindings that shadow it', () => {
    const usage = collectHeadUsage(`
const unrelated = { titleTemplate: '%s | Site' }
function route(useHead) {
  useHead({ titleTemplate: '%s | Site', bodyAttrs: { onresize } })
}
head.push({ titleTemplate: '%s | Site' })
`, '/project/index.js')
    expect(usage).toEqual({ domEvents: false, titleTemplate: false })
  })

  it('returns unknown when a potential call cannot be parsed', () => {
    expect(collectHeadUsage('useHead({ titleTemplate: ', '/project/index.js')).toBeUndefined()
  })
})
