// Rich result schema types that Google supports
export const richResultTypes = new Set([
  'Article',
  'NewsArticle',
  'BlogPosting',
  'ScholarlyArticle',
  'Product',
  'AggregateOffer',
  'Offer',
  'FAQPage',
  'Question',
  'HowTo',
  'HowToStep',
  'Recipe',
  'Event',
  'LocalBusiness',
  'Restaurant',
  'JobPosting',
  'Course',
  'Movie',
  'Book',
  'SoftwareApplication',
  'VideoObject',
  'Review',
  'AggregateRating',
  'BreadcrumbList',
  'SearchAction',
  'Dataset',
  'SpecialAnnouncement',
  'Person',
  'NewsMediaOrganization',
  'Organization',
])

// Google Rich Results requirements for each schema type
export const googleRichResultsRequirements: Record<string, {
  required: string[]
  recommended: string[]
  documentationUrl: string
}> = {
  Article: {
    required: [],
    recommended: ['author', 'author.name', 'dateModified', 'datePublished', 'headline', 'image'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article',
  },
  NewsArticle: {
    required: [],
    recommended: ['author', 'author.name', 'dateModified', 'datePublished', 'headline', 'image'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article',
  },
  BlogPosting: {
    required: [],
    recommended: ['author', 'author.name', 'dateModified', 'datePublished', 'headline', 'image'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/article',
  },
  Product: {
    required: ['name'],
    recommended: ['description', 'offers', 'offers.price', 'offers.priceCurrency', 'offers.availability', 'aggregateRating', 'review', 'image'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/product',
  },
  FAQPage: {
    required: ['mainEntity'],
    recommended: [],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/faqpage',
  },
  Recipe: {
    required: ['name', 'image'],
    recommended: ['aggregateRating', 'author', 'cookTime', 'datePublished', 'description', 'keywords', 'nutrition', 'prepTime', 'recipeCategory', 'recipeCuisine', 'recipeIngredient', 'recipeInstructions', 'recipeYield', 'totalTime', 'video'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/recipe',
  },
  Event: {
    required: ['name', 'location', 'startDate'],
    recommended: ['description', 'endDate', 'eventStatus', 'image', 'offers', 'performer', 'organizer'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/event',
  },
  LocalBusiness: {
    required: ['name', 'address'],
    recommended: ['aggregateRating', 'department', 'geo', 'openingHoursSpecification', 'priceRange', 'telephone', 'url'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  },
  Restaurant: {
    required: ['name', 'address'],
    recommended: ['aggregateRating', 'servesCuisine', 'hasMenu', 'geo', 'openingHoursSpecification', 'priceRange', 'telephone', 'url'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  },
  Review: {
    required: ['author', 'itemReviewed', 'reviewRating'],
    recommended: ['datePublished', 'reviewRating.bestRating', 'reviewRating.worstRating'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/review-snippet',
  },
  AggregateRating: {
    required: ['itemReviewed', 'ratingValue'],
    recommended: ['bestRating', 'worstRating', 'ratingCount', 'reviewCount'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/review-snippet',
  },
  BreadcrumbList: {
    required: ['itemListElement'],
    recommended: [],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
  },
  Organization: {
    required: [],
    recommended: ['name', 'logo', 'url', 'email', 'telephone', 'contactPoint', 'sameAs', 'address', 'description'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/organization',
  },
  Person: {
    required: [],
    recommended: ['name', 'url', 'image', 'sameAs', 'jobTitle', 'worksFor'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/person',
  },
  SoftwareApplication: {
    required: ['name', 'offers'],
    recommended: ['applicationCategory', 'operatingSystem', 'aggregateRating', 'review'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/software-app',
  },
  VideoObject: {
    required: ['name', 'thumbnailUrl', 'uploadDate'],
    recommended: ['contentUrl', 'description', 'duration', 'embedUrl'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/video',
  },
  JobPosting: {
    required: ['datePosted', 'description', 'hiringOrganization', 'jobLocation', 'title'],
    recommended: ['applicantLocationRequirements', 'baseSalary', 'employmentType', 'jobLocationType', 'validThrough'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/job-posting',
  },
  Course: {
    required: ['description', 'name'],
    recommended: ['provider'],
    documentationUrl: 'https://developers.google.com/search/docs/appearance/structured-data/course',
  },
}

// Recursively extract all typed objects from a schema node
function extractNestedTypes(obj: any, nodes: any[], seen: Set<any>): void {
  if (!obj || typeof obj !== 'object' || seen.has(obj))
    return
  seen.add(obj)

  if (obj['@type'] && Object.keys(obj).length > 1) {
    nodes.push(obj)
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        extractNestedTypes(item, nodes, seen)
      }
    }
    else if (typeof value === 'object') {
      extractNestedTypes(value, nodes, seen)
    }
  }
}

// Resolve @id references in a node
function resolveNodeReferences(node: any, nodeMap: Map<string, any>): any {
  const resolved = { ...node }

  Object.keys(resolved).forEach((key) => {
    const value = resolved[key]

    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Object.keys(value).length === 1
      && value['@id']
      && nodeMap.has(value['@id'])
    ) {
      resolved[key] = { ...nodeMap.get(value['@id']) }
    }
    else if (Array.isArray(value)) {
      resolved[key] = value.map((item: any) => {
        if (
          item
          && typeof item === 'object'
          && Object.keys(item).length === 1
          && item['@id']
          && nodeMap.has(item['@id'])
        ) {
          return { ...nodeMap.get(item['@id']) }
        }
        return item
      })
    }
    else if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 1) {
      resolved[key] = resolveNodeReferences(value, nodeMap)
    }
  })

  return resolved
}

// Extract all nodes from a schema graph (including nested @graph and nested types)
export function extractSchemaNodes(data: any): any[] {
  const nodes: any[] = []
  if (!data)
    return nodes

  const seen = new Set<any>()

  if (data['@graph'] && Array.isArray(data['@graph'])) {
    const nodeMap = new Map<string, any>()
    data['@graph'].forEach((node: any) => {
      if (node && typeof node === 'object' && node['@id']) {
        nodeMap.set(node['@id'], node)
      }
    })

    const addedIds = new Set<string>()

    data['@graph'].forEach((node: any) => {
      if (node && typeof node === 'object') {
        if (Object.keys(node).length === 1 && node['@id'])
          return
        if (node['@id'] && addedIds.has(node['@id']))
          return

        const resolvedNode = resolveNodeReferences(node, nodeMap)
        extractNestedTypes(resolvedNode, nodes, seen)

        if (node['@id'])
          addedIds.add(node['@id'])
      }
    })
  }
  else if (data['@type']) {
    extractNestedTypes(data, nodes, seen)
  }

  // Deduplicate nodes that appear multiple times due to @id reference resolution
  const uniqueNodes: any[] = []
  const seenIds = new Set<string>()
  for (const node of nodes) {
    const id = node['@id']
    if (id) {
      if (seenIds.has(id))
        continue
      seenIds.add(id)
    }
    uniqueNodes.push(node)
  }

  return uniqueNodes
}

export function getNodeType(node: any): string {
  if (!node || !node['@type'])
    return 'Unknown'
  return Array.isArray(node['@type']) ? node['@type'][0] : node['@type']
}

export function isRichResultType(type: string): boolean {
  return richResultTypes.has(type)
}

export function getNodeDescription(node: any): string {
  const type = getNodeType(node)

  if (node.name)
    return node.name
  if (node.headline)
    return node.headline
  if (node.title)
    return node.title
  if (node.description) {
    return typeof node.description === 'string'
      ? node.description.substring(0, 100) + (node.description.length > 100 ? '...' : '')
      : ''
  }
  if (node['@id'])
    return node['@id']
  if (node.url)
    return node.url

  return `${type} Schema`
}

export function getNestedProperty(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    }
    else {
      return undefined
    }
  }

  return current
}

export function analyzeNodeProperties(node: any): {
  missingRequired: string[]
  missingRecommended: string[]
  presentProperties: Record<string, any>
} {
  const type = getNodeType(node)
  const requirements = googleRichResultsRequirements[type]

  if (!requirements) {
    return {
      missingRequired: [],
      missingRecommended: [],
      presentProperties: {},
    }
  }

  const missingRequired: string[] = []
  const missingRecommended: string[] = []
  const presentProperties: Record<string, any> = {}

  requirements.required.forEach((prop) => {
    const value = getNestedProperty(node, prop)
    if (value === undefined || value === null || value === '') {
      missingRequired.push(prop)
    }
    else {
      presentProperties[prop] = value
    }
  })

  requirements.recommended.forEach((prop) => {
    const value = getNestedProperty(node, prop)
    if (value === undefined || value === null || value === '') {
      missingRecommended.push(prop)
    }
    else {
      presentProperties[prop] = value
    }
  })

  return { missingRequired, missingRecommended, presentProperties }
}

export function formatPropertyValue(value: any): string {
  if (value === null || value === undefined)
    return 'null'
  if (typeof value === 'string')
    return value.length > 50 ? `${value.substring(0, 50)}...` : value
  if (typeof value === 'number')
    return value.toString()
  if (typeof value === 'boolean')
    return value ? 'true' : 'false'
  if (Array.isArray(value))
    return `[${value.length} items]`
  if (typeof value === 'object' && value['@type'])
    return value['@type']
  if (typeof value === 'object')
    return '{...}'
  return String(value)
}

export function getSchemaIcon(type: string): string {
  const iconMap: Record<string, string> = {
    Article: 'carbon:document',
    NewsArticle: 'carbon:news',
    BlogPosting: 'carbon:blog',
    Product: 'carbon:shopping-cart',
    FAQPage: 'carbon:help',
    Organization: 'carbon:building',
    LocalBusiness: 'carbon:location',
    Person: 'carbon:user',
    Event: 'carbon:calendar',
    SoftwareApplication: 'carbon:application',
    Recipe: 'carbon:restaurant',
    HowTo: 'carbon:list-numbered',
    WebSite: 'carbon:earth',
    WebPage: 'carbon:page-first',
    BreadcrumbList: 'carbon:flow',
    VideoObject: 'carbon:video',
    Review: 'carbon:star',
    AggregateRating: 'carbon:star-filled',
    SearchAction: 'carbon:search',
  }
  return iconMap[type] || 'carbon:code'
}

export interface ValidationSummary {
  totalNodes: number
  richResultNodes: number
  totalErrors: number
  totalWarnings: number
}

// Google structured data page slugs mapped to schema types
export const googleStructuredDataLinks: Record<string, string[]> = {
  'article': ['Article', 'NewsArticle', 'BlogPosting'],
  'book': ['Book'],
  'breadcrumb': ['BreadcrumbList'],
  'carousel': ['ItemList'],
  'course-info': ['Course'],
  'course': ['Course'],
  'dataset': ['Dataset'],
  'discussion-forum': ['DiscussionForumPosting'],
  'education-qa': ['Question', 'Answer'],
  'employer-rating': ['EmployerAggregateRating'],
  'estimated-salary': ['OccupationalExperienceRequirements'],
  'event': ['Event'],
  'factcheck': ['ClaimReview'],
  'faqpage': ['FAQPage'],
  'image-license-metadata': ['ImageObject'],
  'job-posting': ['JobPosting'],
  'learning-video': ['LearningResource', 'VideoObject'],
  'local-business': ['LocalBusiness'],
  'math-solvers': ['MathSolver'],
  'movie': ['Movie'],
  'organization': ['Organization'],
  'practice-problems': ['Quiz', 'Question'],
  'product': ['Product'],
  'product-snippet': ['Product'],
  'merchant-listing': ['Product', 'Offer'],
  'product-variants': ['Product'],
  'profile-page': ['ProfilePage', 'Person'],
  'qapage': ['QAPage'],
  'recipe': ['Recipe'],
  'review-snippet': ['Review'],
  'software-app': ['SoftwareApplication'],
  'speakable': ['SpeakableSpecification'],
  'special-announcements': ['SpecialAnnouncement'],
  'paywalled-content': ['CreativeWork'],
  'vacation-rental': ['Accommodation', 'LodgingBusiness'],
  'vehicle-listing': ['Vehicle'],
  'video': ['VideoObject'],
}

export function nodeToSchemaOrgLink(type: string) {
  const simpleType = type.replace('https://schema.org/', '')
  const googlePage = Object.entries(googleStructuredDataLinks)
    .find(([_, types]) => types.includes(simpleType))?.[0]
  return {
    type: simpleType,
    schemaOrg: `https://schema.org/${simpleType}`,
    googlePage: googlePage ? `https://developers.google.com/search/docs/appearance/structured-data/${googlePage}` : null,
  }
}

export function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export function validateGraph(data: any): { nodes: any[], summary: ValidationSummary } {
  const nodes = extractSchemaNodes(data)

  let totalErrors = 0
  let totalWarnings = 0
  let richResultNodes = 0

  for (const node of nodes) {
    const type = getNodeType(node)
    if (isRichResultType(type))
      richResultNodes++

    const analysis = analyzeNodeProperties(node)
    totalErrors += analysis.missingRequired.length
    totalWarnings += analysis.missingRecommended.length
  }

  return {
    nodes,
    summary: {
      totalNodes: nodes.length,
      richResultNodes,
      totalErrors,
      totalWarnings,
    },
  }
}
