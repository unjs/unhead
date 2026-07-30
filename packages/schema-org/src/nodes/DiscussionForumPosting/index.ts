import type {
  DigitalSourceType,
  Identity,
  IdReference,
  InteractionCounter,
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { ImageObject } from '../Image'
import type { VideoObject } from '../Video'
import type { WebPage } from '../WebPage'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import {
  idReference,
  resolvableDateToIso,
  setIfEmpty,
} from '../../utils'
import { imageResolver } from '../Image'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { videoResolver } from '../Video'
import { PrimaryWebPageId } from '../WebPage'

interface DiscussionContentFields {
  image?: NodeRelations<ImageObject | string>
  text?: string
  video?: NodeRelations<VideoObject>
}

type DiscussionContent
  = | (DiscussionContentFields & { text: string })
    | (DiscussionContentFields & { image: NodeRelations<ImageObject | string> })
    | (DiscussionContentFields & { video: NodeRelations<VideoObject> })

interface DiscussionCommentBase extends Thing {
  '@type'?: 'Comment'
  'author': NodeRelation<Identity>
  'datePublished': ResolvableDate
  'comment'?: NodeRelations<DiscussionComment>
  'commentCount'?: number
  'creativeWorkStatus'?: 'Deleted' | (string & Record<never, never>)
  'dateModified'?: ResolvableDate
  'digitalSourceType'?: DigitalSourceType
  'interactionStatistic'?: NodeRelations<InteractionCounter>
  'sharedContent'?: NodeRelation<WebPage | ImageObject | VideoObject | DiscussionForumPosting | DiscussionComment>
  'url'?: string
}

export type DiscussionComment = DiscussionCommentBase & DiscussionContent

interface DiscussionForumPostingBase extends Thing {
  '@type'?: 'DiscussionForumPosting' | 'SocialMediaPosting'
  'author': NodeRelation<Identity>
  'datePublished': ResolvableDate
  'comment'?: NodeRelations<DiscussionComment>
  'commentCount'?: number
  'creativeWorkStatus'?: 'Deleted' | (string & Record<never, never>)
  'dateModified'?: ResolvableDate
  'digitalSourceType'?: DigitalSourceType
  'headline'?: string
  'interactionStatistic'?: NodeRelations<InteractionCounter>
  'isPartOf'?: NodeRelation<Thing | string>
  'sharedContent'?: NodeRelation<WebPage | ImageObject | VideoObject | DiscussionForumPosting | DiscussionComment>
  'url'?: string
}

type ExternalDiscussionContent = DiscussionContentFields & { url: string }

export type DiscussionForumPostingSimple = DiscussionForumPostingBase & (DiscussionContent | ExternalDiscussionContent)
export type DiscussionForumPosting = DiscussionForumPostingSimple

export const discussionCommentResolver = defineSchemaOrgResolver<DiscussionComment>({
  defaults: {
    '@type': 'Comment',
  },
  resolve(node, ctx) {
    node.author = resolveIdentityRelation(node.author, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }) as NodeRelation<Identity>
    node.comment = resolveRelation(node.comment, ctx, discussionCommentResolver)
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)!
    if (node.image)
      node.image = resolveRelation(node.image as NodeRelations<ImageObject | string>, ctx, imageResolver)
    if (node.video)
      node.video = resolveRelation(node.video as NodeRelations<VideoObject>, ctx, videoResolver)
    return node
  },
})

export const discussionForumPostingResolver = defineSchemaOrgResolver<DiscussionForumPosting>({
  defaults: {
    '@type': 'DiscussionForumPosting',
  },
  inheritMeta: [
    'dateModified',
    'datePublished',
    'url',
  ],
  idPrefix: ['url', '#discussion-forum-posting'],
  resolve(node, ctx) {
    node.author = resolveIdentityRelation(node.author, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }) as NodeRelation<Identity>
    node.comment = resolveRelation(node.comment, ctx, discussionCommentResolver)
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)!
    if (node.image)
      node.image = resolveRelation(node.image as NodeRelations<ImageObject | string>, ctx, imageResolver)
    if (node.video)
      node.video = resolveRelation(node.video as NodeRelations<VideoObject>, ctx, videoResolver)
    return node
  },
  resolveRootNode(node, { find }) {
    const webPage = find(PrimaryWebPageId)
    if (webPage)
      setIfEmpty(node, 'mainEntityOfPage', idReference(webPage) as IdReference)
  },
})
