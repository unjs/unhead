import type { CreateHeadOptions, Head } from '@unhead/schema'
import { createHead as baseCreateHead } from '../createHead'
import PayloadPlugin from './plugins/payload'

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  // @ts-expect-error untyped
  const head = baseCreateHead<T>({ ...options, document: false })
  head.use(PayloadPlugin)
  return head
}
