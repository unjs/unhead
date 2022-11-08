import type { CreateHeadOptions, MergeHead } from '@unhead/schema'
import { VueTriggerDomPatchingOnUpdatesPlugin } from './plugin'
import type { VueHeadClient } from './createHead'
import { createHead } from './createHead'

export function createDomHead<T extends MergeHead>(options: CreateHeadOptions & { document?: Document } = {}): VueHeadClient<T> {
  return createHead({
    ...options,
    plugins: [
      VueTriggerDomPatchingOnUpdatesPlugin({ document: options?.document }),
      ...(options.plugins || []),
    ],
  })
}
