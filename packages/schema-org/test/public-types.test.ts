import type {
  AggregateRating,
  Arrayable,
  CategoryCode,
  Certification,
  Course,
  Dataset,
  DefinedRegion,
  DiscussionForumPosting,
  EducationQuestion,
  EmployerAggregateRating,
  ImageObject,
  JobPosting,
  ListItem,
  LocalBusiness,
  MathSolver,
  MemberProgram,
  MerchantReturnPolicy,
  MerchantReturnPolicySimple,
  MonetaryAmount,
  MonetaryAmountSimple,
  NodeRelation,
  Offer,
  OfferShippingDetails,
  Organization,
  Place,
  PlaceSimple,
  Product,
  QuantitativeSimple,
  QuantitativeValue,
  Question,
  Quiz,
  Recipe,
  ResolverOptions,
  Review,
  ShippingDeliveryTime,
  ShippingService,
  SizeSpecification,
  SoftwareApp,
  SpeakableSpecification,
  VacationRental,
  VideoObject,
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
  expectTypeOf<Dataset['alternateName']>().toEqualTypeOf<string | string[] | undefined>()
  expectTypeOf<ImageObject['license']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<ListItem['url']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<Organization['hasMemberProgram']>().not.toBeUnknown()
  expectTypeOf<Product['hasCertification']>().not.toBeUnknown()
  expectTypeOf<Product['category']>().toEqualTypeOf<Arrayable<NodeRelation<CategoryCode> | string> | undefined>()
  expectTypeOf<Product['size']>().toEqualTypeOf<NodeRelation<SizeSpecification | string> | undefined>()
  expectTypeOf<Question['suggestedAnswer']>().not.toBeUnknown()
  expectTypeOf<Recipe['aggregateRating']>().not.toBeUnknown()
  expectTypeOf<Review['itemReviewed']>().not.toBeUnknown()
  expectTypeOf<VideoObject['publication']>().not.toBeUnknown()
  expectTypeOf<ShippingService['handlingTime']>().not.toBeUnknown()
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

  const priceSpecificationOffer = {
    priceSpecification: {
      price: 12,
      validThrough: '2026-12-31',
    },
  } satisfies Offer
  expectTypeOf(priceSpecificationOffer.priceSpecification.price).toEqualTypeOf<number>()

  const memberPointsOffer = {
    price: 10,
    priceSpecification: {
      membershipPointsEarned: 20,
      validForMemberTier: {
        '@id': 'https://example.com/members#gold',
      },
    },
  } satisfies Offer
  expectTypeOf(memberPointsOffer.priceSpecification.membershipPointsEarned).toEqualTypeOf<number>()

  // @ts-expect-error offers require price or priceSpecification
  const invalidOffer: Offer = {}
  expectTypeOf(invalidOffer).toEqualTypeOf<Offer>()

  // @ts-expect-error aggregate ratings require ratingCount or reviewCount
  const invalidAggregateRating: AggregateRating = {
    ratingValue: 4.5,
  }
  expectTypeOf(invalidAggregateRating).toEqualTypeOf<AggregateRating>()

  const remoteJob = {
    applicantLocationRequirements: {
      '@type': 'Country',
      'name': 'Australia',
    },
    datePosted: '2026-01-01',
    description: 'Remote role',
    hiringOrganization: { name: 'Unhead' },
    jobLocationType: 'TELECOMMUTE',
    title: 'Maintainer',
  } satisfies JobPosting
  expectTypeOf(remoteJob.jobLocationType).toEqualTypeOf<'TELECOMMUTE'>()

  // @ts-expect-error remote jobs require applicantLocationRequirements
  const invalidRemoteJob: JobPosting = {
    datePosted: '2026-01-01',
    description: 'Remote role',
    hiringOrganization: { name: 'Unhead' },
    jobLocationType: 'TELECOMMUTE',
    title: 'Maintainer',
  }
  expectTypeOf(invalidRemoteJob).toEqualTypeOf<JobPosting>()

  const contentUrlImage = {
    contentUrl: '/image.jpg',
  } satisfies ImageObject
  expectTypeOf(contentUrlImage.contentUrl).toEqualTypeOf<string>()

  const videoWithoutGenericUrl = {
    contentUrl: '/video.mp4',
    name: 'Video',
    thumbnailUrl: '/poster.jpg',
    uploadDate: '2026-01-01',
  } satisfies VideoObject
  expectTypeOf(videoWithoutGenericUrl.contentUrl).toEqualTypeOf<string>()

  const speakable = {
    xPath: '/html/body/main',
  } satisfies SpeakableSpecification
  expectTypeOf(speakable.xPath).toEqualTypeOf<string>()

  // @ts-expect-error speakable accepts cssSelector or xPath, not both
  const invalidSpeakable: SpeakableSpecification = {
    cssSelector: '.summary',
    xPath: '/html/body/main',
  }
  expectTypeOf(invalidSpeakable).toEqualTypeOf<SpeakableSpecification>()

  // @ts-expect-error Google Course markup requires description
  const invalidCourse: Course = {
    name: 'Course',
  }
  expectTypeOf(invalidCourse).toEqualTypeOf<Course>()

  // @ts-expect-error Google LocalBusiness markup requires address
  const invalidLocalBusiness: LocalBusiness = {
    name: 'Business',
  }
  expectTypeOf(invalidLocalBusiness).toEqualTypeOf<LocalBusiness>()

  // @ts-expect-error software apps require aggregateRating or review
  const invalidSoftwareApp: SoftwareApp = {
    name: 'App',
    offers: { price: 0 },
  }
  expectTypeOf(invalidSoftwareApp).toEqualTypeOf<SoftwareApp>()

  // @ts-expect-error member programs require a description and at least one tier
  const invalidMemberProgram: MemberProgram = {
    name: 'Members',
  }
  expectTypeOf(invalidMemberProgram).toEqualTypeOf<MemberProgram>()

  // @ts-expect-error shipping services require shipping conditions
  const invalidShippingService: ShippingService = {
    name: 'Standard shipping',
  }
  expectTypeOf(invalidShippingService).toEqualTypeOf<ShippingService>()

  // @ts-expect-error certifications require a name and issuer
  const invalidCertification: Certification = {
    certificationIdentification: '123',
  }
  expectTypeOf(invalidCertification).toEqualTypeOf<Certification>()
})
