// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing'
import { createHead } from 'unhead/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { useScript } from './composables'

describe('angular useScript callback disposal', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({})
  })

  it('fires an onLoaded callback that is left registered', async () => {
    const head = createHead({ document })
    const calls: string[] = []

    TestBed.runInInjectionContext(() => {
      const script = useScript({ src: '//angular-loaded.js' }, { trigger: 'manual', head })
      script.onLoaded(() => {
        calls.push('only')
      })
    })
    // run the mount effect so the deferred registration lands in the callback queue
    TestBed.flushEffects()

    const script = (head as any)._scripts['//angular-loaded.js']
    head.hooks?.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await script._loadPromise

    expect(calls).toEqual(['only'])
  })

  it('disposes the correct onLoaded callback when handles are removed out of order', async () => {
    const head = createHead({ document })

    const calls: string[] = []
    let offFirst!: () => void
    let offSecond!: () => void

    TestBed.runInInjectionContext(() => {
      const script = useScript({ src: '//angular-ordered.js' }, { trigger: 'manual', head })
      offFirst = script.onLoaded(() => {
        calls.push('first')
      }) as unknown as () => void
      offSecond = script.onLoaded(() => {
        calls.push('second')
      }) as unknown as () => void
    })
    TestBed.flushEffects()

    // dispose out of order: index-based cleanup spliced a stale index here,
    // removing `first` but leaving `second` registered
    offFirst()
    offSecond()

    const script = (head as any)._scripts['//angular-ordered.js']
    head.hooks?.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await script._loadPromise

    // both handles disposed, so neither callback should fire
    expect(calls).toEqual([])
  })

  it('forwards keyed callback options to core', async () => {
    const head = createHead({ document })
    const calls: string[] = []

    TestBed.runInInjectionContext(() => {
      const script = useScript({ src: '//angular-keyed.js' }, { trigger: 'manual', head })
      script.onLoaded(() => {
        calls.push('first')
      }, { key: 'shared' })
      script.onLoaded(() => {
        calls.push('second')
      }, { key: 'shared' })
    })
    TestBed.flushEffects()

    const script = (head as any)._scripts['//angular-keyed.js']
    head.hooks?.callHook('script:updated', { script: { id: script.id, status: 'loaded' } as any })
    await script._loadPromise

    expect(calls).toEqual(['first'])
  })
})
