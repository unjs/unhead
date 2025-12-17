import type { SchemaOrgNodeDefinition } from './types'

// Cache for loaded resolvers
const resolverCache: Record<string, SchemaOrgNodeDefinition<any>> = {}

// Dynamic import map for tree-shaking - only imports what's used
const resolverImports: Record<string, () => Promise<{ default?: SchemaOrgNodeDefinition<any>, [key: string]: any }>> = {
  address: () => import('./nodes/PostalAddress'),
  aggregateOffer: () => import('./nodes/AggregateOffer'),
  aggregateRating: () => import('./nodes/AggregateRating'),
  article: () => import('./nodes/Article'),
  breadcrumb: () => import('./nodes/Breadcrumb'),
  comment: () => import('./nodes/Comment'),
  course: () => import('./nodes/Course'),
  event: () => import('./nodes/Event'),
  foodEstablishment: () => import('./nodes/FoodEstablishment'),
  virtualLocation: () => import('./nodes/VirtualLocation'),
  place: () => import('./nodes/Place'),
  howTo: () => import('./nodes/HowTo'),
  howToStep: () => import('./nodes/HowTo/HowToStep'),
  image: () => import('./nodes/Image'),
  localBusiness: () => import('./nodes/LocalBusiness'),
  offer: () => import('./nodes/Offer'),
  openingHours: () => import('./nodes/OpeningHours'),
  organization: () => import('./nodes/Organization'),
  person: () => import('./nodes/Person'),
  product: () => import('./nodes/Product'),
  question: () => import('./nodes/Question'),
  recipe: () => import('./nodes/Recipe'),
  review: () => import('./nodes/Review'),
  video: () => import('./nodes/Video'),
  webPage: () => import('./nodes/WebPage'),
  webSite: () => import('./nodes/WebSite'),
  book: () => import('./nodes/Book'),
  itemList: () => import('./nodes/ItemList'),
  jobPosting: () => import('./nodes/JobPosting'),
  listItem: () => import('./nodes/ListItem'),
  movie: () => import('./nodes/Movie'),
  searchAction: () => import('./nodes/WebSite/SearchAction'),
  readAction: () => import('./nodes/WebPage/ReadAction'),
  softwareApp: () => import('./nodes/SoftwareApp'),
  bookEdition: () => import('./nodes/Book'),
}

// Resolver export name mapping (most follow pattern: nameResolver)
const resolverExportNames: Record<string, string> = {
  address: 'addressResolver',
  aggregateOffer: 'aggregateOfferResolver',
  aggregateRating: 'aggregateRatingResolver',
  article: 'articleResolver',
  breadcrumb: 'breadcrumbResolver',
  comment: 'commentResolver',
  course: 'courseResolver',
  event: 'eventResolver',
  foodEstablishment: 'foodEstablishmentResolver',
  virtualLocation: 'virtualLocationResolver',
  place: 'placeResolver',
  howTo: 'howToResolver',
  howToStep: 'howToStepResolver',
  image: 'imageResolver',
  localBusiness: 'localBusinessResolver',
  offer: 'offerResolver',
  openingHours: 'openingHoursResolver',
  organization: 'organizationResolver',
  person: 'personResolver',
  product: 'productResolver',
  question: 'questionResolver',
  recipe: 'recipeResolver',
  review: 'reviewResolver',
  video: 'videoResolver',
  webPage: 'webPageResolver',
  webSite: 'webSiteResolver',
  book: 'bookResolver',
  itemList: 'itemListResolver',
  jobPosting: 'jobPostingResolver',
  listItem: 'listItemResolver',
  movie: 'movieResolver',
  searchAction: 'searchActionResolver',
  readAction: 'readActionResolver',
  softwareApp: 'softwareAppResolver',
  bookEdition: 'bookEditionResolver',
}

export async function loadResolver(resolver: string): Promise<SchemaOrgNodeDefinition<any> | null> {
  if (resolverCache[resolver])
    return resolverCache[resolver]

  const importFn = resolverImports[resolver]
  if (!importFn)
    return null

  const mod = await importFn()
  const exportName = resolverExportNames[resolver]
  const loaded = mod[exportName] || mod.default
  if (loaded)
    resolverCache[resolver] = loaded
  return loaded || null
}
