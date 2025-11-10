import type {
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { ImageObject } from '../Image'
import type { Person } from '../Person'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolvableDateToIso, resolveWithBase } from '../../utils'
import { personResolver } from '../Person'

/**
 * A collection of music tracks in playlist form.
 */
export interface MusicPlaylistSimple extends Thing {
  /**
   * The name of the music playlist.
   */
  name: string
  /**
   * A description of the music playlist.
   */
  description?: string
  /**
   * The number of tracks in this playlist.
   */
  numTracks?: number
  /**
   * A music recording (track) in this playlist.
   */
  track?: NodeRelations<string>
  /**
   * The creator/curator of the playlist.
   * Can be a Person or MusicGroup reference.
   */
  creator?: NodeRelation<Person | string>
  /**
   * The date the music playlist was published.
   */
  datePublished?: ResolvableDate
  /**
   * The date the music playlist was last modified.
   */
  dateModified?: ResolvableDate
  /**
   * A URL to a page about the music playlist.
   */
  url?: string
  /**
   * An image representing the music playlist.
   */
  image?: NodeRelations<ImageObject | string>
}

export interface MusicPlaylist extends MusicPlaylistSimple {}

/**
 * Describes a collection of music tracks in playlist form.
 */
export const musicPlaylistResolver = defineSchemaOrgResolver<MusicPlaylist>({
  defaults: {
    '@type': 'MusicPlaylist',
  },
  idPrefix: 'host',
  resolve(node, ctx) {
    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)

    if (node.dateModified)
      node.dateModified = resolvableDateToIso(node.dateModified)

    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)

    node.creator = resolveRelation(node.creator, ctx, personResolver)

    return node
  },
})
