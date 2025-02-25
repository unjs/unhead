import type { CreateClientHeadOptions } from 'unhead/types'
import { makeEnvironmentProviders } from '@angular/core'
import { createHead as _createClientHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { UnheadInjectionToken } from '@unhead/angular'

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
