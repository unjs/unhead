import type { CreateHeadOptions, Head } from '@unhead/schema'
import { createHeadCore } from '../createHead'
import PayloadPlugin from './plugins/payload'

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  // @ts-expect-error untyped
  const head = createHeadCore<T>({ ...options, document: false })
  head.use(PayloadPlugin)
  return head
}
