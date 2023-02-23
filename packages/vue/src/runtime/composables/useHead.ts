import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../'
import { injectHead } from '../../'
import { IsBrowser } from '../../env'
import { clientUseHead as _clientUseHead } from './useHead/clientUseHead'
import { serverUseHead as _serverUseHead } from './useHead/serverUseHead'

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = injectHead()
  if (head) {
    const isBrowser = IsBrowser || !!head.resolvedOptions?.document
    if ((options.mode === 'server' && isBrowser) || (options.mode === 'client' && !isBrowser))
      return
    return isBrowser ? _clientUseHead(input, options) : _serverUseHead(input, options)
  }
}
