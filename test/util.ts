import { unheadCtx } from 'unhead'
import { createHead } from 'unhead/client'
import { createHead as createServerHead } from 'unhead/server'

export function createHeadWithContext(options?: any) {
  const head = createHead(options)
  unheadCtx.set(head, true)
  return head
}

export function createServerHeadWithContext(options?: any) {
  const head = createServerHead(options)
  unheadCtx.set(head, true)
  return head
}
