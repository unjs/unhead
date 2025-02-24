import type { Unhead } from 'unhead/types'
import { createContext } from 'react'

export const UnheadContext = createContext<Unhead | null>(null)
