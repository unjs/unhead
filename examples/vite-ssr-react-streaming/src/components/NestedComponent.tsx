import { Suspense, use } from 'react'
import { useHead } from '@unhead/react'

// Outer component - 800ms delay
const outerCache = new Map<string, Promise<{ section: string }>>()

function OuterAsync() {
  const cacheKey = 'outer'
  if (!outerCache.has(cacheKey)) {
    outerCache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({ section: 'Outer Section' }), 800)
    ))
    outerCache.get(cacheKey)!.finally(() => setTimeout(() => outerCache.delete(cacheKey), 100))
  }
  const data = use(outerCache.get(cacheKey)!)

  useHead({
    meta: [
      { name: 'section', content: data.section },
    ],
  })

  return (
    <div className="outer-async">
      <p>{data.section}</p>
      <Suspense fallback={<div className="inner-loading">Loading inner...</div>}>
        <InnerAsync />
      </Suspense>
    </div>
  )
}

// Inner nested component - 600ms delay (after outer resolves)
const innerCache = new Map<string, Promise<{ subsection: string }>>()

function InnerAsync() {
  const cacheKey = 'inner'
  if (!innerCache.has(cacheKey)) {
    innerCache.set(cacheKey, new Promise(resolve =>
      setTimeout(() => resolve({ subsection: 'Inner Subsection' }), 600)
    ))
    innerCache.get(cacheKey)!.finally(() => setTimeout(() => innerCache.delete(cacheKey), 100))
  }
  const data = use(innerCache.get(cacheKey)!)

  useHead({
    meta: [
      { name: 'subsection', content: data.subsection },
    ],
    script: [
      { id: 'inner-config', type: 'application/json', innerHTML: JSON.stringify({ nested: true }) },
    ],
  })

  return (
    <div className="inner-async">
      <p>{data.subsection}</p>
    </div>
  )
}

export default function NestedComponent() {
  return (
    <div className="nested-component">
      <Suspense fallback={<div className="outer-loading">Loading outer...</div>}>
        <OuterAsync />
      </Suspense>
    </div>
  )
}
