import type { NodeRelations, Thing } from '../../types'
import {
  idReference, setIfEmpty,
} from '../../utils'
import { PrimaryWebPageId } from '../WebPage'
import type { VideoObject } from '../Video'
import type { ImageObject } from '../Image'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { HowToStep } from './HowToStep'
import { howToStepResolver } from './HowToStep'

/**
 * Instructions that explain how to achieve a result by performing a sequence of steps.
 */
export interface HowToSimple extends Thing {
  /**
   * A string describing the guide.
   */
  name: string
  /**
   * An array of howToStep objects
   */
  step: NodeRelations<HowToStep | string>[]
  /**
   * The total time required to perform all instructions or directions (including time to prepare the supplies),
   * in ISO 8601 duration format.
   */
  totalTime?: string
  /**
   * Introduction or description content relating to the HowTo guide.
   */
  description?: string
  /**
   * The language code for the guide; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * The estimated cost of the supplies consumed when performing instructions.
   */
  estimatedCost?: string | unknown
  /**
   * Image of the completed how-to.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A supply consumed when performing instructions or a direction.
   */
  supply?: string | unknown
  /**
   * An object used (but not consumed) when performing instructions or a direction.
   */
  tool?: string | unknown
  /**
   * A video of the how-to. Follow the list of required and recommended Video properties.
   * Mark steps of the video with hasPart.
   */
  video?: NodeRelations<VideoObject | string>
}

export interface HowTo extends HowToSimple {}

export const HowToId = '#howto'

/**
 * Describes a HowTo guide, which contains a series of steps.
 */
export const howToResolver = defineSchemaOrgResolver<HowTo>({
  defaults: {
    '@type': 'HowTo',
  },
  inheritMeta: [
    'description',
    'image',
    'inLanguage',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', HowToId],
  resolve(node, ctx) {
    node.step = resolveRelation(node.step, ctx, howToStepResolver)
    return node
  },
  resolveRootNode(node, { find }) {
    const webPage = find(PrimaryWebPageId)
    if (webPage)
      setIfEmpty(node, 'mainEntityOfPage', idReference(webPage))
  },
})

export * from './HowToStep'
export * from './HowToStepDirection'
