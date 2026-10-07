import { describe, expect, it } from 'vitest'
import { lazyUnheadDevtools } from '../src/devtools/lazy'
import { passesTransformFilter } from './utils'

// The lazy proxy declares the hook filter that gates the real devtools
// plugin's transform, so its filter is the one that decides which sources get
// `_source` metadata.
const plugin = lazyUnheadDevtools() as any
const code = `useHead({ title: 'Home' })`

describe('devtools transform filter', () => {
  it.each([
    '/src/main.ts',
    '/src/main.mts',
    '/src/main.cts',
    '/src/main.mjs',
    '/src/main.cjs',
    '/src/Page.tsx',
    '/src/App.vue',
    '/src/App.svelte',
    // dev ids and SFC sub-requests carry a query
    '/src/main.ts?t=1730000000',
    '/src/App.vue?vue&type=script&setup=true',
  ])('runs on %s', (id) => {
    expect(passesTransformFilter(plugin, id, code)).toBe(true)
  })

  it('skips ids and sources that cannot hold a head composable', () => {
    expect(passesTransformFilter(plugin, '/src/style.css', code)).toBe(false)
    expect(passesTransformFilter(plugin, '/src/main.ts', 'const x = 1')).toBe(false)
  })
})
