import type {
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
 * A collection of music tracks in album form.
 */
export interface MusicAlbumSimple extends Thing {
  /**
   * The name of the music album.
   */
  name: string
  /**
   * A description of the music album.
   */
  description?: string
  /**
   * The artist that performed this album.
   * Can be a Person or MusicGroup reference.
   */
  byArtist?: NodeRelations<Person | string>
  /**
   * A music recording (track) on this album.
   */
  track?: NodeRelations<string>
  /**
   * The kind of release which this album is.
   * For example: "StudioAlbum", "LiveAlbum", "CompilationAlbum", "RemixAlbum", "SoundtrackAlbum", etc.
   */
  albumProductionType?: string
  /**
   * The kind of release which this album is.
   * For example: "AlbumRelease", "SingleRelease", "EPRelease", "BroadcastRelease", etc.
   */
  albumReleaseType?: string
  /**
   * The date the music album was published.
   */
  datePublished?: ResolvableDate
  /**
   * Genre of the music album.
   */
  genre?: string | string[]
  /**
   * The number of tracks in this album.
   */
  numTracks?: number
  /**
   * An image representing the music album (album art).
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A URL to a page about the music album.
   */
  url?: string
}

export interface MusicAlbum extends MusicAlbumSimple {}

/**
 * Describes a music album.
 */
export const musicAlbumResolver = defineSchemaOrgResolver<MusicAlbum>({
  defaults: {
    '@type': 'MusicAlbum',
  },
  idPrefix: 'host',
  resolve(node, ctx) {
    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)

    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)

    node.byArtist = resolveRelation(node.byArtist, ctx, personResolver)

    return node
  },
})
