import type { ActiveHeadEntry, HeadEntryOptions, Unhead } from 'unhead/types'
import type {
  AggregateOffer,
  AggregateRating,
  Article,
  Book,
  BookEdition,
  BreadcrumbList,
  Comment,
  Course,
  Dataset,
  Event,
  FoodEstablishment,
  HowTo,
  HowToStep,
  ImageObject,
  ItemList,
  JobPosting,
  ListItem,
  LocalBusiness,
  Movie,
  MusicAlbum,
  MusicGroup,
  MusicPlaylist,
  MusicRecording,
  Offer,
  OpeningHoursSpecification,
  Organization,
  Person,
  Place,
  PodcastEpisode,
  PodcastSeason,
  PodcastSeries,
  PostalAddress,
  Product,
  Question,
  ReadAction,
  Recipe,
  Review,
  SearchAction,
  Service,
  SoftwareApp,
  TVEpisode,
  TVSeason,
  TVSeries,
  VideoObject,
  VirtualLocation,
  WebPage,
  WebSite,
} from './nodes'
import type { Arrayable, Thing } from './types'
import { UnheadSchemaOrg } from './plugin'

function provideResolver<T>(input?: T, resolver?: string) {
  if (!input)
    input = {} as T
  // avoid unreferring by wrapping it in a function
  // @ts-expect-error untyped
  input._resolver = resolver
  return input
}

export function defineAddress<T extends Record<string, any>>(input?: PostalAddress & T) {
  return provideResolver(input, 'address')
}
export function defineAggregateOffer<T extends Record<string, any>>(input?: AggregateOffer & T) {
  return provideResolver(input, 'aggregateOffer')
}
export function defineAggregateRating<T extends Record<string, any>>(input?: AggregateRating & T) {
  return provideResolver(input, 'aggregateRating')
}
export function defineArticle<T extends Record<string, any>>(input?: Article & T) {
  return provideResolver(input, 'article')
}
export function defineBreadcrumb<T extends Record<string, any>>(input?: BreadcrumbList & T) {
  return provideResolver(input, 'breadcrumb')
}
export function defineComment<T extends Record<string, any>>(input?: Comment & T) {
  return provideResolver(input, 'comment')
}
export function defineEvent<T extends Record<string, any>>(input?: Event & T) {
  return provideResolver(input, 'event')
}
export function defineFoodEstablishment<T extends Record<string, any>>(input?: FoodEstablishment & T) {
  return provideResolver(input, 'foodEstablishment')
}
export function defineVirtualLocation<T extends Record<string, any>>(input?: VirtualLocation & T) {
  return provideResolver(input, 'virtualLocation')
}
export function definePlace<T extends Record<string, any>>(input?: Place & T) {
  return provideResolver(input, 'place')
}
export function defineHowTo<T extends Record<string, any>>(input?: HowTo & T) {
  return provideResolver(input, 'howTo')
}
export function defineHowToStep<T extends Record<string, any>>(input?: HowToStep & T) {
  return provideResolver(input, 'howToStep')
}
export function defineImage<T extends Record<string, any>>(input?: ImageObject & T) {
  return provideResolver(input, 'image')
}
export function defineJobPosting<T extends Record<string, any>>(input?: JobPosting & T) {
  return provideResolver(input, 'jobPosting')
}
export function defineLocalBusiness<T extends Record<string, any>>(input?: LocalBusiness & T) {
  return provideResolver(input, 'localBusiness')
}
export function defineOffer<T extends Record<string, any>>(input?: Offer & T) {
  return provideResolver(input, 'offer')
}
export function defineOpeningHours<T extends Record<string, any>>(input?: OpeningHoursSpecification & T) {
  return provideResolver(input, 'openingHours')
}
export function defineOrganization<T extends Record<string, any>>(input?: Organization & T) {
  return provideResolver(input, 'organization')
}
export function definePerson<T extends Record<string, any>>(input?: Person & T) {
  return provideResolver(input, 'person')
}
export function defineProduct<T extends Record<string, any>>(input?: Product & T) {
  return provideResolver(input, 'product')
}
export function defineQuestion<T extends Record<string, any>>(input?: Question & T) {
  return provideResolver(input, 'question')
}
export function defineRecipe<T extends Record<string, any>>(input?: Recipe & T) {
  return provideResolver(input, 'recipe')
}
export function defineReview<T extends Record<string, any>>(input?: Review & T) {
  return provideResolver(input, 'review')
}
export function defineVideo<T extends Record<string, any>>(input?: VideoObject & T) {
  return provideResolver(input, 'video')
}
export function defineWebPage<T extends Record<string, any>>(input?: WebPage & T) {
  return provideResolver(input, 'webPage')
}
export function defineWebSite<T extends Record<string, any>>(input?: WebSite & T) {
  return provideResolver(input, 'webSite')
}
export function defineBook<T extends Record<string, any>>(input?: Book & T) {
  return provideResolver(input, 'book')
}
export function defineCourse<T extends Record<string, any>>(input?: Course & T) {
  return provideResolver(input, 'course')
}
export function defineItemList<T extends Record<string, any>>(input?: ItemList & T) {
  return provideResolver(input, 'itemList')
}
export function defineListItem<T extends Record<string, any>>(input?: ListItem & T) {
  return provideResolver(input, 'listItem')
}
export function defineMovie<T extends Record<string, any>>(input?: Movie & T) {
  return provideResolver(input, 'movie')
}
export function defineSearchAction<T extends Record<string, any>>(input?: SearchAction & T) {
  return provideResolver(input, 'searchAction')
}
export function defineReadAction<T extends Record<string, any>>(input?: ReadAction & T) {
  return provideResolver(input, 'readAction')
}
export function defineDataset<T extends Record<string, any>>(input?: Dataset & T) {
  return provideResolver(input, 'dataset')
}
export function defineMusicRecording<T extends Record<string, any>>(input?: MusicRecording & T) {
  return provideResolver(input, 'musicRecording')
}
export function defineMusicAlbum<T extends Record<string, any>>(input?: MusicAlbum & T) {
  return provideResolver(input, 'musicAlbum')
}
export function defineMusicGroup<T extends Record<string, any>>(input?: MusicGroup & T) {
  return provideResolver(input, 'musicGroup')
}
export function defineMusicPlaylist<T extends Record<string, any>>(input?: MusicPlaylist & T) {
  return provideResolver(input, 'musicPlaylist')
}
export function definePodcastSeries<T extends Record<string, any>>(input?: PodcastSeries & T) {
  return provideResolver(input, 'podcastSeries')
}
export function definePodcastEpisode<T extends Record<string, any>>(input?: PodcastEpisode & T) {
  return provideResolver(input, 'podcastEpisode')
}
export function definePodcastSeason<T extends Record<string, any>>(input?: PodcastSeason & T) {
  return provideResolver(input, 'podcastSeason')
}
export function defineTVSeries<T extends Record<string, any>>(input?: TVSeries & T) {
  return provideResolver(input, 'tvSeries')
}
export function defineTVSeason<T extends Record<string, any>>(input?: TVSeason & T) {
  return provideResolver(input, 'tvSeason')
}
export function defineTVEpisode<T extends Record<string, any>>(input?: TVEpisode & T) {
  return provideResolver(input, 'tvEpisode')
}
export function defineService<T extends Record<string, any>>(input?: Service & T) {
  return provideResolver(input, 'service')
}

/* simple-only */
export function defineSoftwareApp<T extends Record<string, any>>(input?: SoftwareApp & T) {
  return provideResolver(input, 'softwareApp')
}
export function defineBookEdition<T extends Record<string, any>>(input?: BookEdition & T) {
  return provideResolver(input, 'bookEdition')
}
/* end-simple-only */

export type UseSchemaOrgInput = Arrayable<Thing | Record<string, any>>

export function normalizeSchemaOrgInput<T extends UseSchemaOrgInput>(input: T): T {
  // avoid over normalizing
  // @ts-expect-error untyped
  if (input.script) {
    return input as T
  }
  return {
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-org-graph',
        nodes: input,
      },
    ],
  } as any as T
}

export function useSchemaOrg(unhead: Unhead<any>, input: UseSchemaOrgInput = [], options: HeadEntryOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  unhead.use(UnheadSchemaOrg())
  const entry = unhead.push(normalizeSchemaOrgInput(input), options)
  const corePatch = entry.patch
  entry.patch = input => corePatch(normalizeSchemaOrgInput(input))
  return entry
}
