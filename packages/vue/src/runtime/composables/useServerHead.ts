import type { HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../types'
import { serverUseHead as _serverUseHead } from './util/serverUseHead'

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}) {
  // ensure server mode
  return _serverUseHead(input, { ...options, mode: 'server' })
}
