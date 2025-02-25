import * as clientHead from 'unhead/client'
import * as serverHead from 'unhead/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { provideClientHead, provideServerHead, UnheadInjectionToken } from './install'

describe('install module', () => {
  beforeEach(() => {
    // Mock createHead functions
    vi.spyOn(clientHead, 'createHead').mockReturnValue({} as any)
    vi.spyOn(serverHead, 'createHead').mockReturnValue({} as any)
    vi.spyOn(clientHead, 'createDebouncedFn').mockImplementation(fn => fn)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('unheadInjectionToken', () => {
    it('should be an InjectionToken with the correct description', () => {
      expect(UnheadInjectionToken.toString()).toContain('InjectionToken')
      expect(UnheadInjectionToken.toString()).toContain('usehead')
    })
  })

  describe('provideClientHead', () => {
    it('should create a client head instance and return providers', () => {
      provideClientHead()

      expect(clientHead.createHead).toHaveBeenCalled()
    })

    it('should pass options to createHead', () => {
      const options = { document: {} as Document }
      provideClientHead(options)

      expect(clientHead.createHead).toHaveBeenCalledWith(expect.objectContaining({
        document: options.document,
      }))
    })

    it('should set up debounced rendering', () => {
      provideClientHead()

      expect(clientHead.createDebouncedFn).toHaveBeenCalled()
    })
  })

  describe('provideServerHead', () => {
    it('should create a server head instance', () => {
      provideServerHead()

      expect(serverHead.createHead).toHaveBeenCalled()
    })

    it('should pass options to createHead', () => {
      const options = { document: {} as Document }
      provideServerHead(options)

      expect(serverHead.createHead).toHaveBeenCalledWith(options)
    })

    it('should provide BEFORE_APP_SERIALIZED token', () => {
      const providers = provideServerHead()

      // Check if providers include BEFORE_APP_SERIALIZED
      const providersStr = JSON.stringify(providers)
      expect(providersStr).toContain('Server.RENDER_MODULE_HOOK')
      expect(providersStr).toContain('usehead')
    })
  })
})
