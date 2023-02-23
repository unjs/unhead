import type { ActiveHeadEntry, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../'
import { injectHead } from '../../'
import { IsBrowser } from '../../env'
import { clientUseHead as _clientUseHead } from './util/clientUseHead'
import { serverUseHead as _serverUseHead } from './util/serverUseHead'
import {HeadEntryOptions} from "@unhead/schema";

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = injectHead()
  if (head) {
    const isBrowser = IsBrowser || !!head.resolvedOptions?.document
    if ((options.mode === 'server' && isBrowser) || (options.mode === 'client' && !isBrowser))
      return
    return isBrowser ? _clientUseHead(input, options) : _serverUseHead(input, options)
  }
}
