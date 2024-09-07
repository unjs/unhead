import { injectHead, useHead } from '@unhead/vue'
import type { MaybeComputedRefOrFalsy } from '@unhead/vue'
import { UnheadSchemaOrg } from '../../plugin'
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

export type DeepMaybeRef<T> = {
  [key in keyof T]?: MaybeComputedRefOrFalsy<T[key]>
}

function provideResolver<T>(input?: T, resolver?: string) {
  if (!input)
    input = {} as T
  // avoid unreferring by wrapping it in a function
  // @ts-expect-error untyped
  input._resolver = resolver
  return input
}

export function defineAddress<T extends Record<string, any>>(input?: DeepMaybeRef<PostalAddress & T>) {
  return provideResolver(input, 'address')
}
export function defineAggregateOffer<T extends Record<string, any>>(input?: DeepMaybeRef<AggregateOffer & T>) {
  return provideResolver(input, 'aggregateOffer')
}
export function defineAggregateRating<T extends Record<string, any>>(input?: DeepMaybeRef<AggregateRating & T>) {
  return provideResolver(input, 'aggregateRating')
}
export function defineArticle<T extends Record<string, any>>(input?: DeepMaybeRef<Article & T>) {
  return provideResolver(input, 'article')
}
export function defineBreadcrumb<T extends Record<string, any>>(input?: DeepMaybeRef<BreadcrumbList & T>) {
  return provideResolver(input, 'breadcrumb')
}
export function defineComment<T extends Record<string, any>>(input?: DeepMaybeRef<Comment & T>) {
  return provideResolver(input, 'comment')
}
export function defineEvent<T extends Record<string, any>>(input?: DeepMaybeRef<Event & T>) {
  return provideResolver(input, 'event')
}
export function defineFoodEstablishment<T extends Record<string, any>>(input?: DeepMaybeRef<FoodEstablishment & T>) {
  return provideResolver(input, 'foodEstablishment')
}
export function defineVirtualLocation<T extends Record<string, any>>(input?: DeepMaybeRef<VirtualLocation & T>) {
  return provideResolver(input, 'virtualLocation')
}
export function definePlace<T extends Record<string, any>>(input?: DeepMaybeRef<Place & T>) {
  return provideResolver(input, 'place')
}
export function defineHowTo<T extends Record<string, any>>(input?: DeepMaybeRef<HowTo & T>) {
  return provideResolver(input, 'howTo')
}
export function defineHowToStep<T extends Record<string, any>>(input?: DeepMaybeRef<HowToStep & T>) {
  return provideResolver(input, 'howToStep')
}
export function defineImage<T extends Record<string, any>>(input?: DeepMaybeRef<ImageObject & T>) {
  return provideResolver(input, 'image')
}
export function defineJobPosting<T extends Record<string, any>>(input?: DeepMaybeRef<JobPosting & T>) {
  return provideResolver(input, 'jobPosting')
}
export function defineLocalBusiness<T extends Record<string, any>>(input?: DeepMaybeRef<LocalBusiness & T>) {
  return provideResolver(input, 'localBusiness')
}
export function defineOffer<T extends Record<string, any>>(input?: DeepMaybeRef<Offer & T>) {
  return provideResolver(input, 'offer')
}
export function defineOpeningHours<T extends Record<string, any>>(input?: DeepMaybeRef<OpeningHoursSpecification & T>) {
  return provideResolver(input, 'openingHours')
}
export function defineOrganization<T extends Record<string, any>>(input?: DeepMaybeRef<Organization & T>) {
  return provideResolver(input, 'organization')
}
export function definePerson<T extends Record<string, any>>(input?: DeepMaybeRef<Person & T>) {
  return provideResolver(input, 'person')
}
export function defineProduct<T extends Record<string, any>>(input?: DeepMaybeRef<Product & T>) {
  return provideResolver(input, 'product')
}
export function defineQuestion<T extends Record<string, any>>(input?: DeepMaybeRef<Question & T>) {
  return provideResolver(input, 'question')
}
export function defineRecipe<T extends Record<string, any>>(input?: DeepMaybeRef<Recipe & T>) {
  return provideResolver(input, 'recipe')
}
export function defineReview<T extends Record<string, any>>(input?: DeepMaybeRef<Review & T>) {
  return provideResolver(input, 'review')
}
export function defineVideo<T extends Record<string, any>>(input?: DeepMaybeRef<VideoObject & T>) {
  return provideResolver(input, 'video')
}
export function defineWebPage<T extends Record<string, any>>(input?: DeepMaybeRef<WebPage & T>) {
  return provideResolver(input, 'webPage')
}
export function defineWebSite<T extends Record<string, any>>(input?: DeepMaybeRef<WebSite & T>) {
  return provideResolver(input, 'webSite')
}
export function defineBook<T extends Record<string, any>>(input?: DeepMaybeRef<Book & T>) {
  return provideResolver(input, 'book')
}
export function defineCourse<T extends Record<string, any>>(input?: DeepMaybeRef<Course & T>) {
  return provideResolver(input, 'course')
}
export function defineItemList<T extends Record<string, any>>(input?: DeepMaybeRef<ItemList & T>) {
  return provideResolver(input, 'itemList')
}
export function defineListItem<T extends Record<string, any>>(input?: DeepMaybeRef<ListItem & T>) {
  return provideResolver(input, 'listItem')
}
export function defineMovie<T extends Record<string, any>>(input?: DeepMaybeRef<Movie & T>) {
  return provideResolver(input, 'movie')
}
export function defineSearchAction<T extends Record<string, any>>(input?: DeepMaybeRef<SearchAction & T>) {
  return provideResolver(input, 'searchAction')
}
export function defineReadAction<T extends Record<string, any>>(input?: DeepMaybeRef<ReadAction & T>) {
  return provideResolver(input, 'readAction')
}
export function defineSoftwareApp<T extends Record<string, any>>(input?: DeepMaybeRef<SoftwareApp & T>) {
  return provideResolver(input, 'softwareApp')
}
export function defineBookEdition<T extends Record<string, any>>(input?: DeepMaybeRef<BookEdition & T>) {
  return provideResolver(input, 'bookEdition')
}

export type UseSchemaOrgInput = Arrayable<DeepMaybeRef<Thing | Record<string, any>>>

export function useSchemaOrg(input: UseSchemaOrgInput) {
  // lazy initialise the plugin
  const head = injectHead()
  head.use(UnheadSchemaOrg())
  return useHead<{ script: { nodes: UseSchemaOrgInput } }>({
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-org-graph',
        nodes: input,
      },
    ],
  })
}
