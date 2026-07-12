import type { EnvironmentInjector } from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { createEnvironmentInjector, Injector } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { afterEach, describe, expect, it } from 'vitest'
import { provideClientHead } from './client'

const injectors: EnvironmentInjector[] = []

describe('provideClientHead', () => {
  afterEach(() => {
    while (injectors.length)
      injectors.pop()!.destroy()
  })

  it('lets an explicit document override the injected document', () => {
    const injectedDocument = document.implementation.createHTMLDocument()
    const explicitDocument = document.implementation.createHTMLDocument()
    const injector = createEnvironmentInjector([
      { provide: DOCUMENT, useValue: injectedDocument },
      provideClientHead({ document: explicitDocument }),
    ], Injector.NULL)
    injectors.push(injector)

    const head = injector.get(UnheadInjectionToken)
    expect(head.resolvedOptions.document).toBe(explicitDocument)
  })
})
