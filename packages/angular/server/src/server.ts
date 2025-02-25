import type { CreateServerHeadOptions } from 'unhead/types'
import { makeEnvironmentProviders } from '@angular/core'
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server'
import { UnheadInjectionToken } from '@unhead/angular'
import { createHead as _createServerHead } from 'unhead/server'
import { UnheadSSRService } from './ssr.service'

export function provideServerHead(options: CreateServerHeadOptions = {}) {
  const head = _createServerHead(options)
  return makeEnvironmentProviders([
    { provide: UnheadInjectionToken, useValue: head },
    UnheadSSRService,
    {
      provide: BEFORE_APP_SERIALIZED,
      useFactory: (service: UnheadSSRService) => () => {
        return service.render()
      },
      deps: [UnheadSSRService],
      multi: true,
    },
  ])
}
