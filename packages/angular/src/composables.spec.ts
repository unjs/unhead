import type { Injector } from '@angular/core'
import { DestroyRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import * as unhead from 'unhead'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UnheadInjectionToken } from './client'
import { useHead, useHeadSafe, useScript, useSeoMeta, useUnhead } from './composables'

describe('composables', () => {
  let mockUnhead: any
  let mockDestroyRef: any
  let injector: Injector
  let disposeFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    disposeFn = vi.fn()

    // Mock unhead functions
    // Mock unhead functions
    vi.spyOn(unhead, 'useHead').mockImplementation(() => ({
      patch: vi.fn(),
      dispose: disposeFn,
      _poll: vi.fn(),
    }))

    vi.spyOn(unhead, 'useHeadSafe').mockImplementation((head, input) => ({
      patch: vi.fn(),
      dispose: vi.fn(),
    }))

    vi.spyOn(unhead, 'useSeoMeta').mockImplementation((head, input) => ({
      patch: vi.fn(),
      dispose: vi.fn(),
    }))

    vi.spyOn(unhead, 'useScript').mockReturnValue({
      _cbs: {
        loaded: [],
        error: [],
      },
      _triggerAbortController: new AbortController(),
      onLoaded: vi.fn(),
      onError: vi.fn(),
    })

    let destroyCallback: () => void
    mockDestroyRef = {
      onDestroy: vi.fn((fn) => {
        destroyCallback = fn
      }),
    }

    // Mock UnheadInjectionToken
    mockUnhead = {}

    TestBed.configureTestingModule({
      providers: [
        { provide: UnheadInjectionToken, useValue: mockUnhead },
        { provide: DestroyRef, useValue: mockDestroyRef },
      ],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useUnhead', () => {
    it('should return the unhead instance from injection token', () => {
      const result = TestBed.runInInjectionContext(() => useUnhead())
      expect(result).toBe(mockUnhead)
    })

    it('should throw error if not in injection context', () => {
      // Override provider to return undefined
      TestBed.overrideProvider(UnheadInjectionToken, { useValue: undefined })

      expect(() => TestBed.runInInjectionContext(() => useUnhead()))
        .toThrow('NG0204: Token InjectionToken usehead is missing a ɵprov definition.')
    })
  })

  describe('useHead', () => {
    it('should call unhead useHead with signal input', () => {
      const input = { title: 'Test Title' }

      TestBed.runInInjectionContext(() => {
        const result = useHead(input)
        expect(unhead.useHead).toHaveBeenCalled()
        expect(result).toHaveProperty('patch')
        expect(result).toHaveProperty('dispose')
      })
    })
  })

  describe('useHeadSafe', () => {
    it('should call unhead useHeadSafe with signal input', () => {
      const input = { title: 'Test Title' }

      TestBed.runInInjectionContext(() => {
        const result = useHeadSafe(input)
        expect(unhead.useHeadSafe).toHaveBeenCalled()
        expect(result).toHaveProperty('patch')
        expect(result).toHaveProperty('dispose')
      })
    })
  })

  describe('useSeoMeta', () => {
    it('should call unhead useSeoMeta with signal input', () => {
      const input = { description: 'Test Description' }

      TestBed.runInInjectionContext(() => {
        const result = useSeoMeta(input)
        expect(unhead.useSeoMeta).toHaveBeenCalled()
        expect(result).toHaveProperty('patch')
        expect(result).toHaveProperty('dispose')
      })
    })
  })

  describe('useScript', () => {
    it('should handle string input', () => {
      TestBed.runInInjectionContext(() => {
        const result = useScript('https://example.com/script.js')
        expect(unhead.useScript).toHaveBeenCalled()
        expect(result).toHaveProperty('onLoaded')
        expect(result).toHaveProperty('onError')
      })
    })

    it('should handle object input', () => {
      TestBed.runInInjectionContext(() => {
        const result = useScript({ src: 'https://example.com/script.js', async: true })
        expect(unhead.useScript).toHaveBeenCalled()
      })
    })
  })
})
