import type { Unhead } from 'unhead/types'
import { createContext } from 'solid-js'

export const UnheadContext = createContext<Unhead | null>(null)
