import type { HeadEntryOptions } from 'unhead'
import type {
  ReactiveHead,
} from '../../types'
import { useHead } from './index'

export function useServerHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  // ensure server mode
  useHead(input, { ...options, mode: 'server' })
}

