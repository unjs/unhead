import type { HeadContextTarget, ResolvableHead } from 'unhead/types'
import { InjectionToken } from '@angular/core'

export const headSymbol = 'usehead'

export const UnheadInjectionToken = new InjectionToken<HeadContextTarget<ResolvableHead>>(headSymbol)
