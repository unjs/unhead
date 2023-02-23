import type {
  ActiveHeadEntry,
  Head,
  HeadEntryOptions,
} from '@unhead/schema'
import { IsBrowser } from '../../env'
import { getActiveHead } from '../state'

export function useHead<T extends Head>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  const head = getActiveHead()
  if (head) {
    const isBrowser = IsBrowser || head.resolvedOptions?.document
    if ((options.mode === 'server' && isBrowser) || (options.mode === 'client' && !isBrowser))
      return
    return head.push(input, options)
  }
}
