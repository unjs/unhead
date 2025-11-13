import type {
  Arrayable,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { ImageObject } from '../Image'
import type { Person } from '../Person'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToDate, resolveWithBase } from '../../utils'
import { personResolver } from '../Person'

/**
 * A musical group, such as a band, an orchestra, or a choir.
 */
export interface MusicGroupSimple extends Thing {
  /**
   * The name of the music group.
   */
  name: string
  /**
   * A description of the music group.
   */
  description?: string
  /**
   * Genre of the music group.
   */
  genre?: string | string[]
  /**
   * A member of the music group.
   */
  member?: NodeRelations<Person | string>
  /**
   * The date the music group was founded.
   */
  foundingDate?: ResolvableDate
  /**
   * The date the music group dissolved (if applicable).
   */
  dissolutionDate?: ResolvableDate
  /**
   * A music album released by this group.
   */
  album?: NodeRelations<string>
  /**
   * A music recording (track) by this group.
   */
  track?: NodeRelations<string>
  /**
   * A URL to a page about the music group.
   */
  url?: string
  /**
   * An image representing the music group.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * An array of URLs representing declared social/authoritative profiles of the music group
   * (e.g., a Wikipedia page, Facebook profile, or official website).
   */
  sameAs?: Arrayable<string>
}

export interface MusicGroup extends MusicGroupSimple {}

/**
 * Describes a musical group, such as a band, an orchestra, or a choir.
 */
export const musicGroupResolver = defineSchemaOrgResolver<MusicGroup>({
  defaults: {
    '@type': 'MusicGroup',
  },
  idPrefix: 'host',
  inheritMeta: [
    { meta: 'host', key: 'url' },
  ],
  resolve(node, ctx) {
    if (node.foundingDate)
      node.foundingDate = resolvableDateToDate(node.foundingDate)

    if (node.dissolutionDate)
      node.dissolutionDate = resolvableDateToDate(node.dissolutionDate)

    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)

    node.member = resolveRelation(node.member, ctx, personResolver)

    return node
  },
})
