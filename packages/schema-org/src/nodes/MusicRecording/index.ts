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
 * A music recording (track), typically a single song.
 */
export interface MusicRecordingSimple extends Thing {
  /**
   * The name of the music recording.
   */
  name: string
  /**
   * A description of the music recording.
   */
  description?: string
  /**
   * The duration of the music recording in ISO 8601 format (e.g., PT4M23S for 4 minutes 23 seconds).
   */
  duration?: string
  /**
   * The artist that performed this recording.
   * Can be a Person or MusicGroup reference.
   */
  byArtist?: NodeRelations<Person | string>
  /**
   * The album to which this recording belongs.
   */
  inAlbum?: NodeRelation<string>
  /**
   * The playlist(s) this recording belongs to.
   */
  inPlaylist?: NodeRelations<string>
  /**
   * The International Standard Recording Code for the recording.
   */
  isrcCode?: string
  /**
   * The composition this recording is a performance of.
   */
  recordingOf?: NodeRelation<string>
  /**
   * The date the music recording was published.
   */
  datePublished?: ResolvableDate
  /**
   * Genre of the music recording.
   */
  genre?: string | string[]
  /**
   * A URL to a page about the music recording.
   */
  url?: string
  /**
   * A URL to the audio file.
   */
  audio?: string
  /**
   * An image representing the music recording (typically album art).
   */
  image?: NodeRelations<ImageObject | string>
}

export interface MusicRecording extends MusicRecordingSimple {}

/**
 * Describes a music recording (track), typically a single song.
 */
export const musicRecordingResolver = defineSchemaOrgResolver<MusicRecording>({
  defaults: {
    '@type': 'MusicRecording',
  },
  idPrefix: 'host',
  resolve(node, ctx) {
    if (node.datePublished)
      node.datePublished = resolvableDateToIso(node.datePublished)

    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)

    if (node.audio)
      node.audio = resolveWithBase(ctx.meta.host, node.audio)

    node.byArtist = resolveRelation(node.byArtist, ctx, personResolver)

    return node
  },
})
