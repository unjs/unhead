import type { DeepResolvableProperties, UseHeadInput, UseHeadOptions } from '@unhead/vue'
import type { ActiveHeadEntry } from 'unhead/types'
import type { MaybeRef, Ref } from 'vue'
import type { AggregateOffer } from '../../nodes/AggregateOffer'
import type { AggregateRating } from '../../nodes/AggregateRating'
import type { Article } from '../../nodes/Article'
import type { Book, BookEdition } from '../../nodes/Book'
import type { BreadcrumbList } from '../../nodes/Breadcrumb'
import type { Comment } from '../../nodes/Comment'
import type { Course } from '../../nodes/Course'
import type { Dataset } from '../../nodes/Dataset'
import type { Event } from '../../nodes/Event'
import type { FoodEstablishment } from '../../nodes/FoodEstablishment'
import type { HowTo } from '../../nodes/HowTo'
import type { HowToStep } from '../../nodes/HowTo/HowToStep'
import type { ImageObject } from '../../nodes/Image'
import type { ItemList } from '../../nodes/ItemList'
import type { JobPosting } from '../../nodes/JobPosting'
import type { ListItem } from '../../nodes/ListItem'
import type { LocalBusiness } from '../../nodes/LocalBusiness'
import type { Movie } from '../../nodes/Movie'
import type { MusicAlbum } from '../../nodes/MusicAlbum'
import type { MusicGroup } from '../../nodes/MusicGroup'
import type { MusicPlaylist } from '../../nodes/MusicPlaylist'
import type { MusicRecording } from '../../nodes/MusicRecording'
import type { Offer } from '../../nodes/Offer'
import type { OpeningHoursSpecification } from '../../nodes/OpeningHours'
import type { Organization } from '../../nodes/Organization'
import type { Person } from '../../nodes/Person'
import type { Place } from '../../nodes/Place'
import type { PodcastEpisode } from '../../nodes/PodcastEpisode'
import type { PodcastSeason } from '../../nodes/PodcastSeason'
import type { PodcastSeries } from '../../nodes/PodcastSeries'
import type { PostalAddress } from '../../nodes/PostalAddress'
import type { Product } from '../../nodes/Product'
import type { Question } from '../../nodes/Question'
import type { Recipe } from '../../nodes/Recipe'
import type { Review } from '../../nodes/Review'
import type { Service } from '../../nodes/Service'
import type { SoftwareApp } from '../../nodes/SoftwareApp'
import type { TVEpisode } from '../../nodes/TVEpisode'
import type { TVSeason } from '../../nodes/TVSeason'
import type { TVSeries } from '../../nodes/TVSeries'
import type { VideoObject } from '../../nodes/Video'
import type { VirtualLocation } from '../../nodes/VirtualLocation'
import type { WebPage } from '../../nodes/WebPage'
import type { ReadAction } from '../../nodes/WebPage/ReadAction'
import type { WebSite } from '../../nodes/WebSite'
import type { SearchAction } from '../../nodes/WebSite/SearchAction'
import type { Arrayable, SchemaOrgNodeDefinition, Thing } from '../../types'
import { injectHead, useHead } from '@unhead/vue'
import { setVueRefResolver } from '@unhead/vue/utils'
import { aggregateOfferResolver } from '../../nodes/AggregateOffer'
import { aggregateRatingResolver } from '../../nodes/AggregateRating'
import { articleResolver } from '../../nodes/Article'
import { bookEditionResolver, bookResolver } from '../../nodes/Book'
import { breadcrumbResolver } from '../../nodes/Breadcrumb'
import { commentResolver } from '../../nodes/Comment'
import { courseResolver } from '../../nodes/Course'
import { datasetResolver } from '../../nodes/Dataset'
import { eventResolver } from '../../nodes/Event'
import { foodEstablishmentResolver } from '../../nodes/FoodEstablishment'
import { howToResolver } from '../../nodes/HowTo'
import { howToStepResolver } from '../../nodes/HowTo/HowToStep'
import { imageResolver } from '../../nodes/Image'
import { itemListResolver } from '../../nodes/ItemList'
import { jobPostingResolver } from '../../nodes/JobPosting'
import { listItemResolver } from '../../nodes/ListItem'
import { localBusinessResolver } from '../../nodes/LocalBusiness'
import { movieResolver } from '../../nodes/Movie'
import { musicAlbumResolver } from '../../nodes/MusicAlbum'
import { musicGroupResolver } from '../../nodes/MusicGroup'
import { musicPlaylistResolver } from '../../nodes/MusicPlaylist'
import { musicRecordingResolver } from '../../nodes/MusicRecording'
import { offerResolver } from '../../nodes/Offer'
import { openingHoursResolver } from '../../nodes/OpeningHours'
import { organizationResolver } from '../../nodes/Organization'
import { personResolver } from '../../nodes/Person'
import { placeResolver } from '../../nodes/Place'
import { podcastEpisodeResolver } from '../../nodes/PodcastEpisode'
import { podcastSeasonResolver } from '../../nodes/PodcastSeason'
import { podcastSeriesResolver } from '../../nodes/PodcastSeries'
import { addressResolver } from '../../nodes/PostalAddress'
import { productResolver } from '../../nodes/Product'
import { questionResolver } from '../../nodes/Question'
import { recipeResolver } from '../../nodes/Recipe'
import { reviewResolver } from '../../nodes/Review'
import { serviceResolver } from '../../nodes/Service'
import { softwareAppResolver } from '../../nodes/SoftwareApp'
import { tvEpisodeResolver } from '../../nodes/TVEpisode'
import { tvSeasonResolver } from '../../nodes/TVSeason'
import { tvSeriesResolver } from '../../nodes/TVSeries'
import { videoResolver } from '../../nodes/Video'
import { virtualLocationResolver } from '../../nodes/VirtualLocation'
import { webPageResolver } from '../../nodes/WebPage'
import { readActionResolver } from '../../nodes/WebPage/ReadAction'
import { webSiteResolver } from '../../nodes/WebSite'
import { searchActionResolver } from '../../nodes/WebSite/SearchAction'
import { UnheadSchemaOrg } from '../../plugin'
import { normalizeSchemaOrgInput } from '../../runtime'

type VueSchemaOrgDefinerInput<ResolvedInput, Input> = Input & (
  Input extends object ? MaybeRef<DeepResolvableProperties<ResolvedInput>> : unknown
)
type VueSchemaOrgNode<ResolvedInput extends Thing, Input extends object | undefined> = Input extends Ref<unknown>
  ? Input
  : [Input] extends [undefined]
      ? Partial<DeepResolvableProperties<ResolvedInput>>
      : DeepResolvableProperties<ResolvedInput> & Exclude<Input, undefined>

function provideResolver<Input extends object | undefined, ResolvedInput extends Thing, CastInput>(input: Input | undefined, resolver?: SchemaOrgNodeDefinition<ResolvedInput, CastInput>): VueSchemaOrgNode<ResolvedInput, Input> {
  if (!input)
    input = {} as Input
  if (input && typeof input === 'object' && '__v_isRef' in input) {
    // Keep resolver metadata out-of-band so readonly refs retain it without
    // mutating Vue's readonly proxy.
    setVueRefResolver(input, resolver)
    return input as unknown as VueSchemaOrgNode<ResolvedInput, Input>
  }
  // For plain objects, spread and attach resolver
  return { ...input, _resolver: resolver } as unknown as VueSchemaOrgNode<ResolvedInput, Input>
}

export function defineAddress<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<PostalAddress, Input>) {
  return provideResolver(input, addressResolver)
}
export function defineAggregateOffer<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<AggregateOffer, Input>) {
  return provideResolver(input, aggregateOfferResolver)
}
export function defineAggregateRating<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<AggregateRating, Input>) {
  return provideResolver(input, aggregateRatingResolver)
}
export function defineArticle<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Article, Input>) {
  return provideResolver(input, articleResolver)
}
export function defineBreadcrumb<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<BreadcrumbList, Input>) {
  return provideResolver(input, breadcrumbResolver)
}
export function defineComment<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Comment, Input>) {
  return provideResolver(input, commentResolver)
}
export function defineEvent<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Event, Input>) {
  return provideResolver(input, eventResolver)
}
export function defineFoodEstablishment<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<FoodEstablishment, Input>) {
  return provideResolver(input, foodEstablishmentResolver)
}
export function defineVirtualLocation<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<VirtualLocation, Input>) {
  return provideResolver(input, virtualLocationResolver)
}
export function definePlace<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Place, Input>) {
  return provideResolver(input, placeResolver)
}
export function defineHowTo<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<HowTo, Input>) {
  return provideResolver(input, howToResolver)
}
export function defineHowToStep<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<HowToStep, Input>) {
  return provideResolver(input, howToStepResolver)
}
export function defineImage<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<ImageObject, Input>) {
  return provideResolver(input, imageResolver)
}
export function defineJobPosting<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<JobPosting, Input>) {
  return provideResolver(input, jobPostingResolver)
}
export function defineLocalBusiness<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<LocalBusiness, Input>) {
  return provideResolver(input, localBusinessResolver)
}
export function defineOffer<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Offer, Input>) {
  return provideResolver(input, offerResolver)
}
export function defineOpeningHours<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<OpeningHoursSpecification, Input>) {
  return provideResolver(input, openingHoursResolver)
}
export function defineOrganization<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Organization, Input>) {
  return provideResolver(input, organizationResolver)
}
export function definePerson<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Person, Input>) {
  return provideResolver(input, personResolver)
}
export function defineProduct<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Product, Input>) {
  return provideResolver(input, productResolver)
}
export function defineQuestion<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Question, Input>) {
  return provideResolver(input, questionResolver)
}
export function defineRecipe<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Recipe, Input>) {
  return provideResolver(input, recipeResolver)
}
export function defineReview<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Review, Input>) {
  return provideResolver(input, reviewResolver)
}
export function defineVideo<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<VideoObject, Input>) {
  return provideResolver(input, videoResolver)
}
export function defineWebPage<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<WebPage, Input>) {
  return provideResolver(input, webPageResolver)
}
export function defineWebSite<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<WebSite, Input>) {
  return provideResolver(input, webSiteResolver)
}
export function defineBook<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Book, Input>) {
  return provideResolver(input, bookResolver)
}
export function defineCourse<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Course, Input>) {
  return provideResolver(input, courseResolver)
}
export function defineItemList<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<ItemList, Input>) {
  return provideResolver(input, itemListResolver)
}
export function defineListItem<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<ListItem, Input>) {
  return provideResolver(input, listItemResolver)
}
export function defineMovie<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Movie, Input>) {
  return provideResolver(input, movieResolver)
}
export function defineSearchAction<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<SearchAction, Input>) {
  return provideResolver(input, searchActionResolver)
}
export function defineReadAction<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<ReadAction, Input>) {
  return provideResolver(input, readActionResolver)
}
export function defineSoftwareApp<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<SoftwareApp, Input>) {
  return provideResolver(input, softwareAppResolver)
}
export function defineBookEdition<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<BookEdition, Input>) {
  return provideResolver(input, bookEditionResolver)
}
export function defineDataset<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Dataset, Input>) {
  return provideResolver(input, datasetResolver)
}
export function defineMusicRecording<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<MusicRecording, Input>) {
  return provideResolver(input, musicRecordingResolver)
}
export function defineMusicAlbum<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<MusicAlbum, Input>) {
  return provideResolver(input, musicAlbumResolver)
}
export function defineMusicGroup<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<MusicGroup, Input>) {
  return provideResolver(input, musicGroupResolver)
}
export function defineMusicPlaylist<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<MusicPlaylist, Input>) {
  return provideResolver(input, musicPlaylistResolver)
}
export function definePodcastSeries<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<PodcastSeries, Input>) {
  return provideResolver(input, podcastSeriesResolver)
}
export function definePodcastEpisode<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<PodcastEpisode, Input>) {
  return provideResolver(input, podcastEpisodeResolver)
}
export function definePodcastSeason<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<PodcastSeason, Input>) {
  return provideResolver(input, podcastSeasonResolver)
}
export function defineTVSeries<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<TVSeries, Input>) {
  return provideResolver(input, tvSeriesResolver)
}
export function defineTVSeason<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<TVSeason, Input>) {
  return provideResolver(input, tvSeasonResolver)
}
export function defineTVEpisode<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<TVEpisode, Input>) {
  return provideResolver(input, tvEpisodeResolver)
}
export function defineService<Input extends object | undefined = undefined>(input?: VueSchemaOrgDefinerInput<Service, Input>) {
  return provideResolver(input, serviceResolver)
}

export type UseSchemaOrgInput = Arrayable<MaybeRef<DeepResolvableProperties<Thing | Record<string, unknown>>>>

export function useSchemaOrg(input: UseSchemaOrgInput = [], options: UseHeadOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || injectHead()
  unhead.use(UnheadSchemaOrg())
  const entry = useHead(normalizeSchemaOrgInput(input) as unknown as UseHeadInput, options)
  const corePatch = entry.patch
  const publicEntry = entry as unknown as ActiveHeadEntry<UseSchemaOrgInput>
  publicEntry.patch = input => corePatch(normalizeSchemaOrgInput(input) as unknown as UseHeadInput)
  return publicEntry
}
