import { Suspense } from 'react'
import { useHead } from '@unhead/react'
import SlowComponent from './components/SlowComponent'
import FastComponent from './components/FastComponent'
import NestedComponent from './components/NestedComponent'
import SpecialCharsComponent from './components/SpecialCharsComponent'
import SeoComponent from './components/SeoComponent'

export default function App() {
  useHead({
    title: 'React Streaming SSR Demo',
    htmlAttrs: {
      lang: 'en',
      class: 'layout-default',
    },
    bodyAttrs: {
      class: 'app-body',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'Initial description before async load' },
    ],
    script: [
      { id: 'app-config', type: 'application/json', innerHTML: '{"env":"production"}', tagPosition: 'head' },
    ],
  })

  return (
    <div className="app">
      <h1>React Streaming SSR with Unhead</h1>
      <p>This page uses streaming SSR with progressive head updates.</p>

      {/* Fast component - resolves first (500ms) */}
      <Suspense fallback={<div className="loading fast-loading">Loading fast component...</div>}>
        <FastComponent />
      </Suspense>

      {/* Nested Suspense - outer (800ms) then inner (600ms more) */}
      <NestedComponent />

      {/* Special chars and structured data (1000ms) */}
      <Suspense fallback={<div className="loading special-loading">Loading special chars...</div>}>
        <SpecialCharsComponent />
      </Suspense>

      {/* SEO component (1200ms) */}
      <Suspense fallback={<div className="loading seo-loading">Loading SEO data...</div>}>
        <SeoComponent />
      </Suspense>

      {/* Slow component - resolves last (2000ms) */}
      <Suspense fallback={<div className="loading slow-loading">Loading slow component...</div>}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}
