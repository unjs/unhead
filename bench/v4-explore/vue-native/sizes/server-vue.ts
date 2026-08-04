// vue consumer of the seam build: vue serializer, core serializer treeshaken
import type { V4Head } from '../../../../packages/unhead/src/v4/core'
import { renderSSRHeadWith } from '../proto/server-seam'
import { vueSerializer } from '../proto/vue-attrs'

export { createHead } from '../../../../packages/unhead/src/v4/server'
export const renderSSRHead = (head: V4Head) => renderSSRHeadWith(head, vueSerializer)
