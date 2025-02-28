import type { ResolvableProperties, UseHeadInput, UseHeadOptions } from '@unhead/vue'
import type { ActiveHeadEntry } from 'unhead/types'
import type {
  AggregateOffer,
  AggregateRating,
  Article,
  Book,
  BookEdition,
  BreadcrumbList,
  Comment,
  Course,
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
  Offer,
  OpeningHoursSpecification,
  Organization,
  Person,
  Place,
  PostalAddress,
  Product,
  Question,
  ReadAction,
  Recipe,
  Review,
  SearchAction,
  SoftwareApp,
  Thing,
  VideoObject,
  VirtualLocation,
  WebPage,
  WebSite,
} from '../../'
import type { Arrayable } from '../../types'
import { injectHead, useHead } from '@unhead/vue'
import { normalizeSchemaOrgInput,
} from '../../'
import { UnheadSchemaOrg } from '../../plugin'

function provideResolver<T>(input?: T, resolver?: string) {
  if (!input)
    input = {} as T
  // avoid unreferring by wrapping it in a function
  // @ts-expect-error untyped
  input._resolver = resolver
  return input
}

export function defineAddress<T extends Record<string, any>>(input?: ResolvableProperties<PostalAddress & T>) {
  return provideResolver(input, 'address')
}
export function defineAggregateOffer<T extends Record<string, any>>(input?: ResolvableProperties<AggregateOffer & T>) {
  return provideResolver(input, 'aggregateOffer')
}
export function defineAggregateRating<T extends Record<string, any>>(input?: ResolvableProperties<AggregateRating & T>) {
  return provideResolver(input, 'aggregateRating')
}
export function defineArticle<T extends Record<string, any>>(input?: ResolvableProperties<Article & T>) {
  return provideResolver(input, 'article')
}
export function defineBreadcrumb<T extends Record<string, any>>(input?: ResolvableProperties<BreadcrumbList & T>) {
  return provideResolver(input, 'breadcrumb')
}
export function defineComment<T extends Record<string, any>>(input?: ResolvableProperties<Comment & T>) {
  return provideResolver(input, 'comment')
}
export function defineEvent<T extends Record<string, any>>(input?: ResolvableProperties<Event & T>) {
  return provideResolver(input, 'event')
}
export function defineFoodEstablishment<T extends Record<string, any>>(input?: ResolvableProperties<FoodEstablishment & T>) {
  return provideResolver(input, 'foodEstablishment')
}
export function defineVirtualLocation<T extends Record<string, any>>(input?: ResolvableProperties<VirtualLocation & T>) {
  return provideResolver(input, 'virtualLocation')
}
export function definePlace<T extends Record<string, any>>(input?: ResolvableProperties<Place & T>) {
  return provideResolver(input, 'place')
}
export function defineHowTo<T extends Record<string, any>>(input?: ResolvableProperties<HowTo & T>) {
  return provideResolver(input, 'howTo')
}
export function defineHowToStep<T extends Record<string, any>>(input?: ResolvableProperties<HowToStep & T>) {
  return provideResolver(input, 'howToStep')
}
export function defineImage<T extends Record<string, any>>(input?: ResolvableProperties<ImageObject & T>) {
  return provideResolver(input, 'image')
}
export function defineJobPosting<T extends Record<string, any>>(input?: ResolvableProperties<JobPosting & T>) {
  return provideResolver(input, 'jobPosting')
}
export function defineLocalBusiness<T extends Record<string, any>>(input?: ResolvableProperties<LocalBusiness & T>) {
  return provideResolver(input, 'localBusiness')
}
export function defineOffer<T extends Record<string, any>>(input?: ResolvableProperties<Offer & T>) {
  return provideResolver(input, 'offer')
}
export function defineOpeningHours<T extends Record<string, any>>(input?: ResolvableProperties<OpeningHoursSpecification & T>) {
  return provideResolver(input, 'openingHours')
}
export function defineOrganization<T extends Record<string, any>>(input?: ResolvableProperties<Organization & T>) {
  return provideResolver(input, 'organization')
}
export function definePerson<T extends Record<string, any>>(input?: ResolvableProperties<Person & T>) {
  return provideResolver(input, 'person')
}
export function defineProduct<T extends Record<string, any>>(input?: ResolvableProperties<Product & T>) {
  return provideResolver(input, 'product')
}
export function defineQuestion<T extends Record<string, any>>(input?: ResolvableProperties<Question & T>) {
  return provideResolver(input, 'question')
}
export function defineRecipe<T extends Record<string, any>>(input?: ResolvableProperties<Recipe & T>) {
  return provideResolver(input, 'recipe')
}
export function defineReview<T extends Record<string, any>>(input?: ResolvableProperties<Review & T>) {
  return provideResolver(input, 'review')
}
export function defineVideo<T extends Record<string, any>>(input?: ResolvableProperties<VideoObject & T>) {
  return provideResolver(input, 'video')
}
export function defineWebPage<T extends Record<string, any>>(input?: ResolvableProperties<WebPage & T>) {
  return provideResolver(input, 'webPage')
}
export function defineWebSite<T extends Record<string, any>>(input?: ResolvableProperties<WebSite & T>) {
  return provideResolver(input, 'webSite')
}
export function defineBook<T extends Record<string, any>>(input?: ResolvableProperties<Book & T>) {
  return provideResolver(input, 'book')
}
export function defineCourse<T extends Record<string, any>>(input?: ResolvableProperties<Course & T>) {
  return provideResolver(input, 'course')
}
export function defineItemList<T extends Record<string, any>>(input?: ResolvableProperties<ItemList & T>) {
  return provideResolver(input, 'itemList')
}
export function defineListItem<T extends Record<string, any>>(input?: ResolvableProperties<ListItem & T>) {
  return provideResolver(input, 'listItem')
}
export function defineMovie<T extends Record<string, any>>(input?: ResolvableProperties<Movie & T>) {
  return provideResolver(input, 'movie')
}
export function defineSearchAction<T extends Record<string, any>>(input?: ResolvableProperties<SearchAction & T>) {
  return provideResolver(input, 'searchAction')
}
export function defineReadAction<T extends Record<string, any>>(input?: ResolvableProperties<ReadAction & T>) {
  return provideResolver(input, 'readAction')
}
export function defineSoftwareApp<T extends Record<string, any>>(input?: ResolvableProperties<SoftwareApp & T>) {
  return provideResolver(input, 'softwareApp')
}
export function defineBookEdition<T extends Record<string, any>>(input?: ResolvableProperties<BookEdition & T>) {
  return provideResolver(input, 'bookEdition')
}

export type UseSchemaOrgInput = Arrayable<ResolvableProperties<Thing | Record<string, any>>>

export function useSchemaOrg(input: UseSchemaOrgInput = [], options: UseHeadOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || injectHead()
  unhead.use(UnheadSchemaOrg())
  const entry = useHead(normalizeSchemaOrgInput(input) as UseHeadInput, options) as ActiveHeadEntry<UseSchemaOrgInput>
  const corePatch = entry.patch
  entry.patch = input => corePatch(normalizeSchemaOrgInput(input))
  return entry
}
