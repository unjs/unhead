import type { HeadEntryOptions } from 'unhead'
import { injectHead } from '../..'
import type {
  ReactiveHead,
} from '../../types'

export function useHead(input: ReactiveHead, options: HeadEntryOptions = {}) {
  const head = injectHead()
  head.push(input, options)
}

