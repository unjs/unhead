import type {
  DefinedRegion,
  DiscussionForumPosting,
  EducationQuestion,
  EmployerAggregateRating,
  MathSolver,
  MerchantReturnPolicy,
  MerchantReturnPolicySimple,
  MonetaryAmount,
  MonetaryAmountSimple,
  OfferShippingDetails,
  Place,
  PlaceSimple,
  QuantitativeSimple,
  QuantitativeValue,
  Quiz,
  ResolverOptions,
  ShippingDeliveryTime,
  VacationRental,
  VirtualLocation,
  VirtualLocationSimple,
} from '../src'
import { expectTypeOf, it } from 'vitest'

it('exports schema resolver options from the package entry', () => {
  expectTypeOf<ResolverOptions>().toHaveProperty('array')
  expectTypeOf<ResolverOptions>().toHaveProperty('root')
  expectTypeOf<ResolverOptions>().toHaveProperty('generateId')
  expectTypeOf<ResolverOptions>().toHaveProperty('afterResolve')
})

it('exports schema node types used by public helpers', () => {
  expectTypeOf<DefinedRegion>().toHaveProperty('addressCountry')
  expectTypeOf<DiscussionForumPosting>().toHaveProperty('datePublished')
  expectTypeOf<EducationQuestion>().toHaveProperty('eduQuestionType')
  expectTypeOf<EmployerAggregateRating>().toHaveProperty('itemReviewed')
  expectTypeOf<MathSolver>().toHaveProperty('potentialAction')
  expectTypeOf<MerchantReturnPolicy>().toEqualTypeOf<MerchantReturnPolicySimple>()
  expectTypeOf<MonetaryAmount>().toEqualTypeOf<MonetaryAmountSimple>()
  expectTypeOf<QuantitativeValue>().toEqualTypeOf<QuantitativeSimple>()
  expectTypeOf<Quiz>().toHaveProperty('hasPart')
  expectTypeOf<OfferShippingDetails>().toHaveProperty('shippingDestination')
  expectTypeOf<Place>().toEqualTypeOf<PlaceSimple>()
  expectTypeOf<ShippingDeliveryTime>().toHaveProperty('transitTime')
  expectTypeOf<VirtualLocation>().toEqualTypeOf<VirtualLocationSimple>()
  expectTypeOf<VacationRental>().toHaveProperty('containsPlace')
})

it('requires Google rich result property alternatives', () => {
  const employerRating = {
    itemReviewed: { name: 'Example' },
    ratingCount: 5,
    ratingValue: 4.5,
  } satisfies EmployerAggregateRating
  expectTypeOf(employerRating.ratingCount).toEqualTypeOf<number>()

  // @ts-expect-error employer ratings require ratingCount or reviewCount
  const invalidEmployerRating: EmployerAggregateRating = {
    itemReviewed: { name: 'Example' },
    ratingValue: 4.5,
  }
  expectTypeOf(invalidEmployerRating).toEqualTypeOf<EmployerAggregateRating>()

  const rental = {
    containsPlace: { occupancy: { value: 2 } },
    geo: { latitude: -38.1, longitude: 144.3 },
    identifier: 'rental-1',
    image: '/rental.jpg',
    name: 'Beach House',
  } satisfies VacationRental
  expectTypeOf(rental.geo.latitude).toEqualTypeOf<number>()

  // @ts-expect-error vacation rentals require a complete direct or nested location
  const invalidRental: VacationRental = {
    containsPlace: { occupancy: { value: 2 } },
    identifier: 'rental-1',
    image: '/rental.jpg',
    latitude: -38.1,
    name: 'Beach House',
  }
  expectTypeOf(invalidRental).toEqualTypeOf<VacationRental>()
})
