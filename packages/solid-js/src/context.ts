import type { HeadContextTarget, ResolvableHead } from 'unhead/types'
import { createContext } from 'solid-js'

export const UnheadContext = createContext<HeadContextTarget<ResolvableHead> | null>(null)
