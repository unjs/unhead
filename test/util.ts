import { createHead, unheadCtx } from 'unhead'

export function createHeadWithContext(options?: any) {
  const head = createHead(options)
  unheadCtx.set(head, true)
  return head
}
