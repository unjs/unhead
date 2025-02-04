import type { Unhead } from '@unhead/schema'
import { createContext } from 'react'

export const UnheadContext = createContext<Unhead<any> | null>(null)
