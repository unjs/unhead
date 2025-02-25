import type { Unhead } from 'unhead/types'
import { InjectionToken } from '@angular/core'

export const headSymbol = 'usehead'

export const UnheadInjectionToken = new InjectionToken<Unhead>(headSymbol)
