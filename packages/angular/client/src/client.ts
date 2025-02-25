import type { CreateClientHeadOptions } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { inject, makeEnvironmentProviders } from '@angular/core'
import { UnheadInjectionToken } from '@unhead/angular'
import { createHead as _createClientHead, createDebouncedFn, renderDOMHead } from 'unhead/client'

export function provideClientHead(options: CreateClientHeadOptions = {}) {
  return makeEnvironmentProviders([{
    provide: UnheadInjectionToken,
    useFactory: () => {
      const document = inject(DOCUMENT)
      const head = _createClientHead({
        document,
        domOptions: {
          render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(() => fn(), 0)),
        },
        ...options,
      })
      return head
    },
  }])
}
