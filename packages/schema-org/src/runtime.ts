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
  WebPage,
  WebSite,
} from './nodes'
import type { Place } from './nodes/Place'
import type { VirtualLocation } from './nodes/VirtualLocation'
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

type SchemaOrgDefinerInput<ResolvedInput, Input> = Input & (Input extends object ? ResolvedInput : unknown)
type DefinedSchemaOrgNode<ResolvedInput, CastInput, Input> = (
  [Input] extends [undefined]
    ? Partial<ResolvedInput>
    : ResolvedInput & Exclude<Input, undefined>
) & { _resolver?: SchemaOrgNodeDefinition<ResolvedInput, CastInput> }

function provideResolver<Input extends object | undefined, ResolvedInput extends Thing, CastInput>(input: Input | undefined, resolver?: SchemaOrgNodeDefinition<ResolvedInput, CastInput>): DefinedSchemaOrgNode<ResolvedInput, CastInput, Input> {
  return { ...(input || {} as Input), _resolver: resolver } as DefinedSchemaOrgNode<ResolvedInput, CastInput, Input>
}

export function defineAddress<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<PostalAddress, Input>) {
  return provideResolver(input, addressResolver)
}
export function defineAggregateOffer<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<AggregateOffer, Input>) {
  return provideResolver(input, aggregateOfferResolver)
}
export function defineAggregateRating<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<AggregateRating, Input>) {
  return provideResolver(input, aggregateRatingResolver)
}
export function defineArticle<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Article, Input>) {
  return provideResolver(input, articleResolver)
}
export function defineBreadcrumb<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<BreadcrumbList, Input>) {
  return provideResolver(input, breadcrumbResolver)
}
export function defineComment<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Comment, Input>) {
  return provideResolver(input, commentResolver)
}
export function defineEvent<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Event, Input>) {
  return provideResolver(input, eventResolver)
}
export function defineFoodEstablishment<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<FoodEstablishment, Input>) {
  return provideResolver(input, foodEstablishmentResolver)
}
export function defineVirtualLocation<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<VirtualLocation, Input>) {
  return provideResolver(input, virtualLocationResolver)
}
export function definePlace<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Place, Input>) {
  return provideResolver(input, placeResolver)
}
export function defineHowTo<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<HowTo, Input>) {
  return provideResolver(input, howToResolver)
}
export function defineHowToStep<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<HowToStep, Input>) {
  return provideResolver(input, howToStepResolver)
}
export function defineImage<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<ImageObject, Input>) {
  return provideResolver(input, imageResolver)
}
export function defineJobPosting<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<JobPosting, Input>) {
  return provideResolver(input, jobPostingResolver)
}
export function defineLocalBusiness<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<LocalBusiness, Input>) {
  return provideResolver(input, localBusinessResolver)
}
export function defineOffer<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Offer, Input>) {
  return provideResolver(input, offerResolver)
}
export function defineOpeningHours<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<OpeningHoursSpecification, Input>) {
  return provideResolver(input, openingHoursResolver)
}
export function defineOrganization<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Organization, Input>) {
  return provideResolver(input, organizationResolver)
}
export function definePerson<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Person, Input>) {
  return provideResolver(input, personResolver)
}
export function defineProduct<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Product, Input>) {
  return provideResolver(input, productResolver)
}
export function defineQuestion<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Question, Input>) {
  return provideResolver(input, questionResolver)
}
export function defineRecipe<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Recipe, Input>) {
  return provideResolver(input, recipeResolver)
}
export function defineReview<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Review, Input>) {
  return provideResolver(input, reviewResolver)
}
export function defineVideo<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<VideoObject, Input>) {
  return provideResolver(input, videoResolver)
}
export function defineWebPage<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<WebPage, Input>) {
  return provideResolver(input, webPageResolver)
}
export function defineWebSite<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<WebSite, Input>) {
  return provideResolver(input, webSiteResolver)
}
export function defineBook<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Book, Input>) {
  return provideResolver(input, bookResolver)
}
export function defineCourse<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Course, Input>) {
  return provideResolver(input, courseResolver)
}
export function defineItemList<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<ItemList, Input>) {
  return provideResolver(input, itemListResolver)
}
export function defineListItem<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<ListItem, Input>) {
  return provideResolver(input, listItemResolver)
}
export function defineMovie<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Movie, Input>) {
  return provideResolver(input, movieResolver)
}
export function defineSearchAction<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<SearchAction, Input>) {
  return provideResolver(input, searchActionResolver)
}
export function defineReadAction<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<ReadAction, Input>) {
  return provideResolver(input, readActionResolver)
}
export function defineDataset<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Dataset, Input>) {
  return provideResolver(input, datasetResolver)
}
export function defineMusicRecording<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<MusicRecording, Input>) {
  return provideResolver(input, musicRecordingResolver)
}
export function defineMusicAlbum<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<MusicAlbum, Input>) {
  return provideResolver(input, musicAlbumResolver)
}
export function defineMusicGroup<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<MusicGroup, Input>) {
  return provideResolver(input, musicGroupResolver)
}
export function defineMusicPlaylist<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<MusicPlaylist, Input>) {
  return provideResolver(input, musicPlaylistResolver)
}
export function definePodcastSeries<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<PodcastSeries, Input>) {
  return provideResolver(input, podcastSeriesResolver)
}
export function definePodcastEpisode<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<PodcastEpisode, Input>) {
  return provideResolver(input, podcastEpisodeResolver)
}
export function definePodcastSeason<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<PodcastSeason, Input>) {
  return provideResolver(input, podcastSeasonResolver)
}
export function defineTVSeries<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<TVSeries, Input>) {
  return provideResolver(input, tvSeriesResolver)
}
export function defineTVSeason<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<TVSeason, Input>) {
  return provideResolver(input, tvSeasonResolver)
}
export function defineTVEpisode<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<TVEpisode, Input>) {
  return provideResolver(input, tvEpisodeResolver)
}
export function defineService<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<Service, Input>) {
  return provideResolver(input, serviceResolver)
}

/* simple-only */
export function defineSoftwareApp<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<SoftwareApp, Input>) {
  return provideResolver(input, softwareAppResolver)
}
export function defineBookEdition<Input extends object | undefined = undefined>(input?: SchemaOrgDefinerInput<BookEdition, Input>) {
  return provideResolver(input, bookEditionResolver)
}
/* end-simple-only */

export type UseSchemaOrgInput = Arrayable<Thing | Record<string, unknown>>

export interface SchemaOrgHeadInput<T = UseSchemaOrgInput> {
  script: [{
    type: 'application/ld+json'
    key: 'schema-org-graph'
    nodes: T
  }]
}

interface ReadonlySchemaOrgHeadInput<T> {
  readonly script: readonly [{
    readonly type: 'application/ld+json'
    readonly key: 'schema-org-graph'
    readonly nodes: T
  }]
}

interface PotentialSchemaOrgHeadInput {
  readonly script: readonly {
    readonly type: string
    readonly key: string
    readonly nodes: unknown
  }[]
}

export function normalizeSchemaOrgInput<const Input extends ReadonlySchemaOrgHeadInput<unknown>>(input: Input): Input
export function normalizeSchemaOrgInput<const Input extends PotentialSchemaOrgHeadInput>(input: Input): Input | SchemaOrgHeadInput<Input>
export function normalizeSchemaOrgInput<T>(input: T): SchemaOrgHeadInput<T>
export function normalizeSchemaOrgInput(input: unknown): SchemaOrgHeadInput<unknown> {
  // avoid over normalizing
  const script = (input as PotentialSchemaOrgHeadInput | null)?.script
  const graph = script?.[0]
  if (Array.isArray(script)
    && script.length === 1
    && graph
    && typeof graph === 'object'
    && graph.type === 'application/ld+json'
    && graph.key === 'schema-org-graph'
    && 'nodes' in graph) {
    return input as SchemaOrgHeadInput<unknown>
  }
  return {
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-org-graph',
        nodes: input,
      },
    ],
  }
}

export function useSchemaOrg<HeadInput, RenderResult>(unhead: Unhead<HeadInput, RenderResult>, input: UseSchemaOrgInput = [], options: HeadEntryOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  unhead.use(UnheadSchemaOrg())
  const entry = (unhead as unknown as Unhead<SchemaOrgHeadInput<UseSchemaOrgInput>>).push(
    normalizeSchemaOrgInput(input),
    options,
  )
  const corePatch = entry.patch
  const publicEntry = entry as unknown as ActiveHeadEntry<UseSchemaOrgInput>
  publicEntry.patch = input => corePatch(normalizeSchemaOrgInput(input))
  return publicEntry
}
