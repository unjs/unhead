import type { Head } from '@unhead/schema'
import type { CreateHeadOptions } from '../types'

export type HeadPlugin<O> = Omit<CreateHeadOptions<O>, 'plugins'>

export function defineHeadPlugin<O = Head>(plugin: HeadPlugin<O>): HeadPlugin<O> {
  return plugin
}
