import type { DeepResolvableProperties, UseHeadInput, UseHeadOptions } from '@unhead/vue'
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
import type { Arrayable, SchemaOrgNodeDefinition } from '../../types'
import { injectHead, useHead } from '@unhead/vue'
import { toValue } from 'vue'
import { normalizeSchemaOrgInput,
} from '../../'
import { aggregateOfferResolver } from '../../nodes/AggregateOffer'
import { aggregateRatingResolver } from '../../nodes/AggregateRating'
import { articleResolver } from '../../nodes/Article'
import { bookEditionResolver, bookResolver } from '../../nodes/Book'
import { breadcrumbResolver } from '../../nodes/Breadcrumb'
import { commentResolver } from '../../nodes/Comment'
import { courseResolver } from '../../nodes/Course'
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
import { offerResolver } from '../../nodes/Offer'
import { openingHoursResolver } from '../../nodes/OpeningHours'
import { organizationResolver } from '../../nodes/Organization'
import { personResolver } from '../../nodes/Person'
import { placeResolver } from '../../nodes/Place'
import { addressResolver } from '../../nodes/PostalAddress'
import { productResolver } from '../../nodes/Product'
import { questionResolver } from '../../nodes/Question'
import { recipeResolver } from '../../nodes/Recipe'
import { reviewResolver } from '../../nodes/Review'
import { softwareAppResolver } from '../../nodes/SoftwareApp'
import { videoResolver } from '../../nodes/Video'
import { virtualLocationResolver } from '../../nodes/VirtualLocation'
import { webPageResolver } from '../../nodes/WebPage'
import { readActionResolver } from '../../nodes/WebPage/ReadAction'
import { webSiteResolver } from '../../nodes/WebSite'
import { searchActionResolver } from '../../nodes/WebSite/SearchAction'
import { UnheadSchemaOrg } from '../../plugin'

function provideResolver<T>(input?: T, resolver?: SchemaOrgNodeDefinition<any>): any {
  if (!input)
    input = {} as T
  // Check if input is a Vue ref
  if (input && typeof input === 'object' && '__v_isRef' in input) {
    // Attach resolver to the inner value so it survives toValue() unwrapping
    const inner = toValue(input)
    if (inner && typeof inner === 'object') {
      (inner as any)._resolver = resolver
    }
    return input
  }
  // For plain objects, spread and attach resolver
  return { ...input, _resolver: resolver } as T & { _resolver?: SchemaOrgNodeDefinition<any> }
}

export function defineAddress<T extends Record<string, any>>(input?: DeepResolvableProperties<PostalAddress & T>) {
  return provideResolver(input, addressResolver)
}
export function defineAggregateOffer<T extends Record<string, any>>(input?: DeepResolvableProperties<AggregateOffer & T>) {
  return provideResolver(input, aggregateOfferResolver)
}
export function defineAggregateRating<T extends Record<string, any>>(input?: DeepResolvableProperties<AggregateRating & T>) {
  return provideResolver(input, aggregateRatingResolver)
}
export function defineArticle<T extends Record<string, any>>(input?: DeepResolvableProperties<Article & T>) {
  return provideResolver(input, articleResolver)
}
export function defineBreadcrumb<T extends Record<string, any>>(input?: DeepResolvableProperties<BreadcrumbList & T>) {
  return provideResolver(input, breadcrumbResolver)
}
export function defineComment<T extends Record<string, any>>(input?: DeepResolvableProperties<Comment & T>) {
  return provideResolver(input, commentResolver)
}
export function defineEvent<T extends Record<string, any>>(input?: DeepResolvableProperties<Event & T>) {
  return provideResolver(input, eventResolver)
}
export function defineFoodEstablishment<T extends Record<string, any>>(input?: DeepResolvableProperties<FoodEstablishment & T>) {
  return provideResolver(input, foodEstablishmentResolver)
}
export function defineVirtualLocation<T extends Record<string, any>>(input?: DeepResolvableProperties<VirtualLocation & T>) {
  return provideResolver(input, virtualLocationResolver)
}
export function definePlace<T extends Record<string, any>>(input?: DeepResolvableProperties<Place & T>) {
  return provideResolver(input, placeResolver)
}
export function defineHowTo<T extends Record<string, any>>(input?: DeepResolvableProperties<HowTo & T>) {
  return provideResolver(input, howToResolver)
}
export function defineHowToStep<T extends Record<string, any>>(input?: DeepResolvableProperties<HowToStep & T>) {
  return provideResolver(input, howToStepResolver)
}
export function defineImage<T extends Record<string, any>>(input?: DeepResolvableProperties<ImageObject & T>) {
  return provideResolver(input, imageResolver)
}
export function defineJobPosting<T extends Record<string, any>>(input?: DeepResolvableProperties<JobPosting & T>) {
  return provideResolver(input, jobPostingResolver)
}
export function defineLocalBusiness<T extends Record<string, any>>(input?: DeepResolvableProperties<LocalBusiness & T>) {
  return provideResolver(input, localBusinessResolver)
}
export function defineOffer<T extends Record<string, any>>(input?: DeepResolvableProperties<Offer & T>) {
  return provideResolver(input, offerResolver)
}
export function defineOpeningHours<T extends Record<string, any>>(input?: DeepResolvableProperties<OpeningHoursSpecification & T>) {
  return provideResolver(input, openingHoursResolver)
}
export function defineOrganization<T extends Record<string, any>>(input?: DeepResolvableProperties<Organization & T>) {
  return provideResolver(input, organizationResolver)
}
export function definePerson<T extends Record<string, any>>(input?: DeepResolvableProperties<Person & T>) {
  return provideResolver(input, personResolver)
}
export function defineProduct<T extends Record<string, any>>(input?: DeepResolvableProperties<Product & T>) {
  return provideResolver(input, productResolver)
}
export function defineQuestion<T extends Record<string, any>>(input?: DeepResolvableProperties<Question & T>) {
  return provideResolver(input, questionResolver)
}
export function defineRecipe<T extends Record<string, any>>(input?: DeepResolvableProperties<Recipe & T>) {
  return provideResolver(input, recipeResolver)
}
export function defineReview<T extends Record<string, any>>(input?: DeepResolvableProperties<Review & T>) {
  return provideResolver(input, reviewResolver)
}
export function defineVideo<T extends Record<string, any>>(input?: DeepResolvableProperties<VideoObject & T>) {
  return provideResolver(input, videoResolver)
}
export function defineWebPage<T extends Record<string, any>>(input?: DeepResolvableProperties<WebPage & T>) {
  return provideResolver(input, webPageResolver)
}
export function defineWebSite<T extends Record<string, any>>(input?: DeepResolvableProperties<WebSite & T>) {
  return provideResolver(input, webSiteResolver)
}
export function defineBook<T extends Record<string, any>>(input?: DeepResolvableProperties<Book & T>) {
  return provideResolver(input, bookResolver)
}
export function defineCourse<T extends Record<string, any>>(input?: DeepResolvableProperties<Course & T>) {
  return provideResolver(input, courseResolver)
}
export function defineItemList<T extends Record<string, any>>(input?: DeepResolvableProperties<ItemList & T>) {
  return provideResolver(input, itemListResolver)
}
export function defineListItem<T extends Record<string, any>>(input?: DeepResolvableProperties<ListItem & T>) {
  return provideResolver(input, listItemResolver)
}
export function defineMovie<T extends Record<string, any>>(input?: DeepResolvableProperties<Movie & T>) {
  return provideResolver(input, movieResolver)
}
export function defineSearchAction<T extends Record<string, any>>(input?: DeepResolvableProperties<SearchAction & T>) {
  return provideResolver(input, searchActionResolver)
}
export function defineReadAction<T extends Record<string, any>>(input?: DeepResolvableProperties<ReadAction & T>) {
  return provideResolver(input, readActionResolver)
}
export function defineSoftwareApp<T extends Record<string, any>>(input?: DeepResolvableProperties<SoftwareApp & T>) {
  return provideResolver(input, softwareAppResolver)
}
export function defineBookEdition<T extends Record<string, any>>(input?: DeepResolvableProperties<BookEdition & T>) {
  return provideResolver(input, bookEditionResolver)
}

export type UseSchemaOrgInput = Arrayable<DeepResolvableProperties<Thing | Record<string, any>>>

export function useSchemaOrg(input: UseSchemaOrgInput = [], options: UseHeadOptions = {}): ActiveHeadEntry<UseSchemaOrgInput> {
  // lazy initialise the plugin
  const unhead = options.head || injectHead()
  unhead.use(UnheadSchemaOrg())
  const entry = useHead(normalizeSchemaOrgInput(input) as UseHeadInput, options) as ActiveHeadEntry<UseSchemaOrgInput>
  const corePatch = entry.patch
  entry.patch = input => corePatch(normalizeSchemaOrgInput(input))
  return entry
}
