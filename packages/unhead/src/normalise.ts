import type { Head, HeadEntry, HeadTag } from '@unhead/schema'
import { ValidHeadTags, normaliseTag } from 'zhead'
import { asArray } from './util'
import { TagEntityBits } from './constants'

export async function normaliseEntryTags<T extends {} = Head>(e: HeadEntry<T>): Promise<HeadTag[]> {
  const tagPromises: Promise<HeadTag | HeadTag[]>[] = []
  Object.entries(e.input)
    .filter(([k, v]) => typeof v !== 'undefined' && ValidHeadTags.includes(k))
    .forEach(([k, value]) => {
      const v = asArray(value)
      tagPromises.push(...v.map(props => normaliseTag(k as keyof Head, props)).flat())
    })
  return (await Promise.all(tagPromises))
    .flat()
    .map((t: HeadTag, i) => {
      t._e = e._i
      t._p = (e._i << TagEntityBits) + i
      return t
    }) as unknown as HeadTag[]
}
