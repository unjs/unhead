import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { inject, makeEnvironmentProviders } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { createHead as _createClientHead, createDebouncedFn, createDomRenderer } from 'unhead/client'

export function provideClientHead(options: CreateClientHeadOptions = {}) {
  return makeEnvironmentProviders([{
    provide: UnheadInjectionToken,
    useFactory: () => {
      const document = inject(DOCUMENT)
      const domRenderer = createDomRenderer({ document })
      let head: Unhead
      const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => setTimeout(() => fn(), 0))
      head = _createClientHead({ document, render: debouncedRenderer, ...options })
      return head
    },
  }])
}
