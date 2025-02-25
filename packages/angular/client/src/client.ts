import type { CreateClientHeadOptions } from 'unhead/types'
import { makeEnvironmentProviders } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { createHead as _createClientHead, createDebouncedFn, renderDOMHead } from 'unhead/client'

export function provideClientHead(options: CreateClientHeadOptions = {}) {
  const head = _createClientHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(() => fn(), 0)),
    },
    ...options,
  })
  return makeEnvironmentProviders([
    { provide: UnheadInjectionToken, useValue: head },
  ])
}
