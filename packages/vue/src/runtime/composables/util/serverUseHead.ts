import type { ActiveHeadEntry, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { UseHeadInput } from '../../../'
import { injectHead } from '../../../'

export function serverUseHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> {
  const head = injectHead()
  return head.push(input, options)
}
