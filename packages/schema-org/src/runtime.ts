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
import type { Arrayable, SchemaOrgNodeDefinition, Thing } from './types'
import { aggregateOfferResolver } from './nodes/AggregateOffer'
import { aggregateRatingResolver } from './nodes/AggregateRating'
import { articleResolver } from './nodes/Article'
import { bookEditionResolver, bookResolver } from './nodes/Book'
import { breadcrumbResolver } from './nodes/Breadcrumb'
import { commentResolver } from './nodes/Comment'
import { courseResolver } from './nodes/Course'
import { datasetResolver } from './nodes/Dataset'
import { eventResolver } from './nodes/Event'
import { foodEstablishmentResolver } from './nodes/FoodEstablishment'
import { howToResolver } from './nodes/HowTo'
import { howToStepResolver } from './nodes/HowTo/HowToStep'
import { imageResolver } from './nodes/Image'
import { itemListResolver } from './nodes/ItemList'
import { jobPostingResolver } from './nodes/JobPosting'
import { listItemResolver } from './nodes/ListItem'
import { localBusinessResolver } from './nodes/LocalBusiness'
import { movieResolver } from './nodes/Movie'
import { musicAlbumResolver } from './nodes/MusicAlbum'
import { musicGroupResolver } from './nodes/MusicGroup'
import { musicPlaylistResolver } from './nodes/MusicPlaylist'
import { musicRecordingResolver } from './nodes/MusicRecording'
import { offerResolver } from './nodes/Offer'
import { openingHoursResolver } from './nodes/OpeningHours'
import { organizationResolver } from './nodes/Organization'
import { personResolver } from './nodes/Person'
import { placeResolver } from './nodes/Place'
import { podcastEpisodeResolver } from './nodes/PodcastEpisode'
import { podcastSeasonResolver } from './nodes/PodcastSeason'
import { podcastSeriesResolver } from './nodes/PodcastSeries'
import { addressResolver } from './nodes/PostalAddress'
import { productResolver } from './nodes/Product'
import { questionResolver } from './nodes/Question'
import { recipeResolver } from './nodes/Recipe'
import { reviewResolver } from './nodes/Review'
import { serviceResolver } from './nodes/Service'
import { softwareAppResolver } from './nodes/SoftwareApp'
import { tvEpisodeResolver } from './nodes/TVEpisode'
import { tvSeasonResolver } from './nodes/TVSeason'
import { tvSeriesResolver } from './nodes/TVSeries'
import { videoResolver } from './nodes/Video'
import { virtualLocationResolver } from './nodes/VirtualLocation'
import { webPageResolver } from './nodes/WebPage'
import { readActionResolver } from './nodes/WebPage/ReadAction'
import { webSiteResolver } from './nodes/WebSite'
import { searchActionResolver } from './nodes/WebSite/SearchAction'
import { UnheadSchemaOrg } from './plugin'

function provideResolver<T>(input?: T, resolver?: SchemaOrgNodeDefinition<any>): T & { _resolver?: SchemaOrgNodeDefinition<any> } {
  if (!input)
    input = {} as T
  return { ...input, _resolver: resolver } as T & { _resolver?: SchemaOrgNodeDefinition<any> }
}

export function defineAddress<T extends Record<string, any>>(input?: PostalAddress & T) {
  return provideResolver(input, addressResolver)
}
export function defineAggregateOffer<T extends Record<string, any>>(input?: AggregateOffer & T) {
  return provideResolver(input, aggregateOfferResolver)
}
export function defineAggregateRating<T extends Record<string, any>>(input?: AggregateRating & T) {
  return provideResolver(input, aggregateRatingResolver)
}
export function defineArticle<T extends Record<string, any>>(input?: Article & T) {
  return provideResolver(input, articleResolver)
}
export function defineBreadcrumb<T extends Record<string, any>>(input?: BreadcrumbList & T) {
  return provideResolver(input, breadcrumbResolver)
}
export function defineComment<T extends Record<string, any>>(input?: Comment & T) {
  return provideResolver(input, commentResolver)
}
export function defineEvent<T extends Record<string, any>>(input?: Event & T) {
  return provideResolver(input, eventResolver)
}
export function defineFoodEstablishment<T extends Record<string, any>>(input?: FoodEstablishment & T) {
  return provideResolver(input, foodEstablishmentResolver)
}
export function defineVirtualLocation<T extends Record<string, any>>(input?: VirtualLocation & T) {
  return provideResolver(input, virtualLocationResolver)
}
export function definePlace<T extends Record<string, any>>(input?: Place & T) {
  return provideResolver(input, placeResolver)
}
export function defineHowTo<T extends Record<string, any>>(input?: HowTo & T) {
  return provideResolver(input, howToResolver)
}
export function defineHowToStep<T extends Record<string, any>>(input?: HowToStep & T) {
  return provideResolver(input, howToStepResolver)
}
export function defineImage<T extends Record<string, any>>(input?: ImageObject & T) {
  return provideResolver(input, imageResolver)
}
export function defineJobPosting<T extends Record<string, any>>(input?: JobPosting & T) {
  return provideResolver(input, jobPostingResolver)
}
export function defineLocalBusiness<T extends Record<string, any>>(input?: LocalBusiness & T) {
  return provideResolver(input, localBusinessResolver)
}
export function defineOffer<T extends Record<string, any>>(input?: Offer & T) {
  return provideResolver(input, offerResolver)
}
export function defineOpeningHours<T extends Record<string, any>>(input?: OpeningHoursSpecification & T) {
  return provideResolver(input, openingHoursResolver)
}
export function defineOrganization<T extends Record<string, any>>(input?: Organization & T) {
  return provideResolver(input, organizationResolver)
}
export function definePerson<T extends Record<string, any>>(input?: Person & T) {
  return provideResolver(input, personResolver)
}
export function defineProduct<T extends Record<string, any>>(input?: Product & T) {
  return provideResolver(input, productResolver)
}
export function defineQuestion<T extends Record<string, any>>(input?: Question & T) {
  return provideResolver(input, questionResolver)
}
export function defineRecipe<T extends Record<string, any>>(input?: Recipe & T) {
  return provideResolver(input, recipeResolver)
}
export function defineReview<T extends Record<string, any>>(input?: Review & T) {
  return provideResolver(input, reviewResolver)
}
export function defineVideo<T extends Record<string, any>>(input?: VideoObject & T) {
  return provideResolver(input, videoResolver)
}
export function defineWebPage<T extends Record<string, any>>(input?: WebPage & T) {
  return provideResolver(input, webPageResolver)
}
export function defineWebSite<T extends Record<string, any>>(input?: WebSite & T) {
  return provideResolver(input, webSiteResolver)
}
export function defineBook<T extends Record<string, any>>(input?: Book & T) {
  return provideResolver(input, bookResolver)
}
export function defineCourse<T extends Record<string, any>>(input?: Course & T) {
  return provideResolver(input, courseResolver)
}
export function defineItemList<T extends Record<string, any>>(input?: ItemList & T) {
  return provideResolver(input, itemListResolver)
}
export function defineListItem<T extends Record<string, any>>(input?: ListItem & T) {
  return provideResolver(input, listItemResolver)
}
export function defineMovie<T extends Record<string, any>>(input?: Movie & T) {
  return provideResolver(input, movieResolver)
}
export function defineSearchAction<T extends Record<string, any>>(input?: SearchAction & T) {
  return provideResolver(input, searchActionResolver)
}
export function defineReadAction<T extends Record<string, any>>(input?: ReadAction & T) {
  return provideResolver(input, readActionResolver)
}
export function defineDataset<T extends Record<string, any>>(input?: Dataset & T) {
  return provideResolver(input, datasetResolver)
}
export function defineMusicRecording<T extends Record<string, any>>(input?: MusicRecording & T) {
  return provideResolver(input, musicRecordingResolver)
}
export function defineMusicAlbum<T extends Record<string, any>>(input?: MusicAlbum & T) {
  return provideResolver(input, musicAlbumResolver)
}
export function defineMusicGroup<T extends Record<string, any>>(input?: MusicGroup & T) {
  return provideResolver(input, musicGroupResolver)
}
export function defineMusicPlaylist<T extends Record<string, any>>(input?: MusicPlaylist & T) {
  return provideResolver(input, musicPlaylistResolver)
}
export function definePodcastSeries<T extends Record<string, any>>(input?: PodcastSeries & T) {
  return provideResolver(input, podcastSeriesResolver)
}
export function definePodcastEpisode<T extends Record<string, any>>(input?: PodcastEpisode & T) {
  return provideResolver(input, podcastEpisodeResolver)
}
export function definePodcastSeason<T extends Record<string, any>>(input?: PodcastSeason & T) {
  return provideResolver(input, podcastSeasonResolver)
}
export function defineTVSeries<T extends Record<string, any>>(input?: TVSeries & T) {
  return provideResolver(input, tvSeriesResolver)
}
export function defineTVSeason<T extends Record<string, any>>(input?: TVSeason & T) {
  return provideResolver(input, tvSeasonResolver)
}
export function defineTVEpisode<T extends Record<string, any>>(input?: TVEpisode & T) {
  return provideResolver(input, tvEpisodeResolver)
}
export function defineService<T extends Record<string, any>>(input?: Service & T) {
  return provideResolver(input, serviceResolver)
}

/* simple-only */
export function defineSoftwareApp<T extends Record<string, any>>(input?: SoftwareApp & T) {
  return provideResolver(input, softwareAppResolver)
}
export function defineBookEdition<T extends Record<string, any>>(input?: BookEdition & T) {
  return provideResolver(input, bookEditionResolver)
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
