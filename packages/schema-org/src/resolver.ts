import type { SchemaOrgNodeDefinition } from './types'
import {
  addressResolver,
  aggregateOfferResolver,
  aggregateRatingResolver,
  articleResolver,
  bookEditionResolver,
  bookResolver,
  breadcrumbResolver,
  commentResolver,
  courseResolver,
  datasetResolver,
  eventResolver,
  foodEstablishmentResolver,
  howToResolver,
  howToStepResolver,
  imageResolver,
  itemListResolver,
  jobPostingResolver,
  listItemResolver,
  localBusinessResolver,
  movieResolver,
  musicAlbumResolver,
  musicGroupResolver,
  musicPlaylistResolver,
  musicRecordingResolver,
  offerResolver,
  openingHoursResolver,
  organizationResolver,
  personResolver,
  placeResolver,
  podcastEpisodeResolver,
  podcastSeasonResolver,
  podcastSeriesResolver,
  productResolver,
  questionResolver,
  readActionResolver,
  recipeResolver,
  reviewResolver,
  searchActionResolver,
  serviceResolver,
  softwareAppResolver,
  tvEpisodeResolver,
  tvSeasonResolver,
  tvSeriesResolver,
  videoResolver,
  virtualLocationResolver,
  webPageResolver,
  webSiteResolver,
} from './nodes'

export function loadResolver(resolver: string): SchemaOrgNodeDefinition<any> | null {
  switch (resolver) {
    case 'address':
      return addressResolver
    case 'aggregateOffer':
      return aggregateOfferResolver
    case 'aggregateRating':
      return aggregateRatingResolver
    case 'article':
      return articleResolver
    case 'breadcrumb':
      return breadcrumbResolver
    case 'comment':
      return commentResolver
    case 'event':
      return eventResolver
    case 'foodEstablishment':
      return foodEstablishmentResolver
    case 'virtualLocation':
      return virtualLocationResolver
    case 'place':
      return placeResolver
    case 'howTo':
      return howToResolver
    case 'howToStep':
      return howToStepResolver
    case 'image':
      return imageResolver
    case 'localBusiness':
      return localBusinessResolver
    case 'offer':
      return offerResolver
    case 'openingHours':
      return openingHoursResolver
    case 'organization':
      return organizationResolver
    case 'person':
      return personResolver
    case 'product':
      return productResolver
    case 'question':
      return questionResolver
    case 'recipe':
      return recipeResolver
    case 'review':
      return reviewResolver
    case 'video':
      return videoResolver
    case 'webPage':
      return webPageResolver
    case 'webSite':
      return webSiteResolver
    case 'book':
      return bookResolver
    case 'course':
      return courseResolver
    case 'itemList':
      return itemListResolver
    case 'jobPosting':
      return jobPostingResolver
    case 'listItem':
      return listItemResolver
    case 'movie':
      return movieResolver
    case 'searchAction':
      return searchActionResolver
    case 'readAction':
      return readActionResolver
    case 'softwareApp':
      return softwareAppResolver
    case 'bookEdition':
      return bookEditionResolver
    case 'dataset':
      return datasetResolver
    case 'musicRecording':
      return musicRecordingResolver
    case 'musicAlbum':
      return musicAlbumResolver
    case 'musicGroup':
      return musicGroupResolver
    case 'musicPlaylist':
      return musicPlaylistResolver
    case 'podcastSeries':
      return podcastSeriesResolver
    case 'podcastEpisode':
      return podcastEpisodeResolver
    case 'podcastSeason':
      return podcastSeasonResolver
    case 'tvSeries':
      return tvSeriesResolver
    case 'tvSeason':
      return tvSeasonResolver
    case 'tvEpisode':
      return tvEpisodeResolver
    case 'service':
      return serviceResolver
  }
  return null
}
