// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing'
import { createHead } from 'unhead/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { useScript } from './composables'

describe('angular useScript lifecycle', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({})
  })

  it('disposes callbacks by identity', async () => {
    const head = createHead({ document })
    const calls: string[] = []
    let offFirst!: () => void
    let offSecond!: () => void

    TestBed.runInInjectionContext(() => {
      const script = useScript({ src: '//ordered-callbacks.js' }, { trigger: 'manual', head })
      offFirst = script.onLoaded(() => calls.push('first')) as unknown as () => void
      offSecond = script.onLoaded(() => calls.push('second')) as unknown as () => void
    })
    TestBed.flushEffects()

    offFirst()
    offSecond()

    const script = (head as any)._scripts['//ordered-callbacks.js']
    script.status = 'loaded'
    await head.hooks?.callHook('script:updated', { script })
    await script._loadPromise

    expect(calls).toEqual([])
  })
})
