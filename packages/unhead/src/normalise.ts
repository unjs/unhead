import type { Head, HeadEntry, HeadTag } from '@unhead/schema'
import { ValidHeadTags, normaliseTag } from 'zhead'
import { asArray } from './util'
import { TagEntityBits } from './constants'

export function normaliseEntryTags<T extends {} = Head>(e: HeadEntry<T>) {
  return Object.entries(e.input)
    .filter(([k, v]) => typeof v !== 'undefined' && ValidHeadTags.includes(k))
    .map(([k, value]) => asArray(value)
    // @ts-expect-error untyped
      .map(props => asArray(normaliseTag<HeadTag>(k as HeadTag['tag'], props, e))),
    )
    .flat(3)
    .map((t, i) => {
      t._e = e._i
      t._p = (e._i << TagEntityBits) + i
      return t
    })
}
