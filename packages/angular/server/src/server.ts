import type { CreateServerHeadOptions } from 'unhead/types'
import { makeEnvironmentProviders } from '@angular/core'
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server'
import { createHead as _createServerHead } from 'unhead/server'
import { UnheadInjectionToken, Unhead } from '@unhead/angular'

export function provideServerHead(options: CreateServerHeadOptions = {}) {
  const head = _createServerHead(options)
  return makeEnvironmentProviders([
    { provide: UnheadInjectionToken, useValue: head },
    Unhead,
    {
      provide: BEFORE_APP_SERIALIZED,
      useFactory: (service: Unhead) => () => {
        return service._ssrModifyResponse()
      },
      deps: [Unhead],
      multi: true,
    },
  ])
}
