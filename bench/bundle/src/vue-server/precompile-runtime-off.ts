import type { HeadEntryOptions, ResolvableHead, Unhead, UseSeoMetaInput } from 'unhead/types'
import { useHead as useCoreHead, useSeoMeta as useCoreSeoMeta } from '../../../../packages/unhead/src/index'
import { renderSSRHead as renderCoreSSRHead } from '../../../../packages/unhead/src/server'

export { createHead } from '../../../../packages/unhead/src/server'
export { resolveTags } from '../../../../packages/unhead/src/utils'

type EntryOptions = HeadEntryOptions & { head: Unhead<any> }

export function useHead(input: ResolvableHead, options: EntryOptions) {
  return useCoreHead(options.head, input, options)
}

export function useSeoMeta(input: UseSeoMetaInput, options: EntryOptions) {
  return useCoreSeoMeta(options.head, input, options)
}

export function renderSSRHead(head: Unhead<any>) {
  return renderCoreSSRHead(head, { omitLineBreaks: true })
}
