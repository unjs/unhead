<script setup lang="ts">
import type { SearchEngine } from '~/composables/tools'
import { state } from '~/composables/state'
import { ENGINE_LIMITS, estimatePixelWidth, extractKeywords, descColor as getDescColor, titleColor as getTitleColor, SEO_LIMITS } from '~/composables/tools'
import {
  analyzeNodeProperties,
  asArray,
  extractSchemaNodes,
  getNodeDescription,
  getNodeType,
  getSchemaIcon,
  isRichResultType,
  nodeToSchemaOrgLink,
} from '~/utils/schema-validation'

const DURATION_RE = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/

const seo = computed(() => state.value.seo)

const titleLen = computed(() => seo.value.title?.length || 0)
const descLen = computed(() => seo.value.description?.length || 0)
const tColor = computed(() => getTitleColor(titleLen.value))
const dColor = computed(() => getDescColor(descLen.value))

// Mobile / Desktop toggle
const previewMode = ref<'desktop' | 'mobile'>('desktop')

// Title template
const titleTemplate = computed(() => state.value.titleTemplate)
const templateParams = computed(() => state.value.templateParams)
const separator = computed(() => state.value.separator || '|')
const hasTitleTemplate = computed(() => !!titleTemplate.value)

// SEO checklist
const checklist = computed(() => {
  const items: { label: string, status: 'success' | 'warning' | 'error', detail: string }[] = []

  // Title
  if (!seo.value.title)
    items.push({ label: 'Title', status: 'error', detail: 'Missing' })
  else if (titleLen.value > SEO_LIMITS.TITLE_MAX_CHARS)
    items.push({ label: 'Title', status: 'error', detail: `Too long (${titleLen.value}/${SEO_LIMITS.TITLE_MAX_CHARS})` })
  else if (titleLen.value < 30)
    items.push({ label: 'Title', status: 'warning', detail: `Too short (${titleLen.value} chars)` })
  else
    items.push({ label: 'Title', status: 'success', detail: `${titleLen.value} chars` })

  // Description
  if (!seo.value.description)
    items.push({ label: 'Description', status: 'error', detail: 'Missing' })
  else if (descLen.value > SEO_LIMITS.DESC_MAX_CHARS)
    items.push({ label: 'Description', status: 'error', detail: `Too long (${descLen.value}/${SEO_LIMITS.DESC_MAX_CHARS})` })
  else if (descLen.value < 70)
    items.push({ label: 'Description', status: 'warning', detail: `Too short (${descLen.value} chars)` })
  else
    items.push({ label: 'Description', status: 'success', detail: `${descLen.value} chars` })

  // Canonical
  if (!seo.value.canonical)
    items.push({ label: 'Canonical URL', status: 'warning', detail: 'Not set' })
  else
    items.push({ label: 'Canonical URL', status: 'success', detail: seo.value.canonical })

  // Robots
  if (!seo.value.robots)
    items.push({ label: 'Robots', status: 'warning', detail: 'Not set (defaults to index, follow)' })
  else if (seo.value.robots.includes('noindex'))
    items.push({ label: 'Robots', status: 'error', detail: `noindex detected: ${seo.value.robots}` })
  else
    items.push({ label: 'Robots', status: 'success', detail: seo.value.robots })

  // OG Title
  if (!seo.value.ogTitle)
    items.push({ label: 'og:title', status: 'warning', detail: 'Not set (falls back to title)' })
  else
    items.push({ label: 'og:title', status: 'success', detail: seo.value.ogTitle })

  // OG Description
  if (!seo.value.ogDescription)
    items.push({ label: 'og:description', status: 'warning', detail: 'Not set (falls back to description)' })
  else
    items.push({ label: 'og:description', status: 'success', detail: seo.value.ogDescription })

  // OG Image
  if (!seo.value.ogImage)
    items.push({ label: 'og:image', status: 'error', detail: 'Missing' })
  else
    items.push({ label: 'og:image', status: 'success', detail: seo.value.ogImage })

  return items
})

const checklistScore = computed(() => {
  const total = checklist.value.length
  const passed = checklist.value.filter(i => i.status === 'success').length
  return { passed, total }
})

// OG vs SERP comparison
const ogMismatches = computed(() => {
  const mismatches: { field: string, serp: string, og: string }[] = []
  if (seo.value.ogTitle && seo.value.title && seo.value.ogTitle !== seo.value.title)
    mismatches.push({ field: 'Title', serp: seo.value.title, og: seo.value.ogTitle })
  if (seo.value.ogDescription && seo.value.description && seo.value.ogDescription !== seo.value.description)
    mismatches.push({ field: 'Description', serp: seo.value.description, og: seo.value.ogDescription })
  return mismatches
})

// Keywords
const keywords = computed(() => {
  const combined = `${seo.value.title || ''} ${seo.value.description || ''}`
  return extractKeywords(combined).slice(0, 10)
})

// Multi-engine
const engines = computed(() => {
  return (Object.keys(ENGINE_LIMITS) as SearchEngine[]).map((key) => {
    const engine = ENGINE_LIMITS[key]
    const titleStatus = titleLen.value > engine.titleMax ? 'error' : titleLen.value < 30 ? 'warning' : 'success'
    const descStatus = descLen.value > engine.descMax ? 'error' : descLen.value < 70 ? 'warning' : 'success'
    return {
      key,
      ...engine,
      titleStatus,
      descStatus,
      titleLen: titleLen.value,
      descLen: descLen.value,
    }
  })
})

function lengthStatusLabel(color: string): string {
  if (color === 'success')
    return 'Good'
  if (color === 'warning')
    return 'Needs work'
  return 'Too long'
}

function checkIcon(status: string): string {
  if (status === 'success')
    return 'i-carbon-checkmark-filled'
  if (status === 'warning')
    return 'i-carbon-warning-filled'
  return 'i-carbon-close-filled'
}

function checkIconColor(status: string): string {
  if (status === 'success')
    return 'text-green-500'
  if (status === 'warning')
    return 'text-amber-400'
  return 'text-red-400'
}

// Rich Results from JSON-LD
const jsonLdData = computed(() => {
  const jsonLdTags = state.value.tags.filter(
    t => t.tag === 'script' && t.props?.type === 'application/ld+json',
  )
  if (!jsonLdTags.length)
    return null
  for (const tag of jsonLdTags) {
    try {
      return JSON.parse(tag.innerHTML || '{}')
    }
    catch {
      continue
    }
  }
  return null
})

const richResultNodes = computed(() => {
  if (!jsonLdData.value)
    return []
  const nodes = extractSchemaNodes(jsonLdData.value)
  return nodes.filter(n => isRichResultType(getNodeType(n)))
})

// Build rich result preview data for each node type
interface RichPreview {
  type: string
  icon: string
  label: string
  features: { icon: string, text: string }[]
  rating?: { value: number, count: number, max: number }
  price?: string
  breadcrumbs?: string[]
  faqItems?: { question: string }[]
  eventDate?: string
  eventLocation?: string
  videoThumbnail?: string
  videoDuration?: string
  eligibility: 'eligible' | 'partial' | 'ineligible'
  missingRequired: string[]
  documentationUrl?: string
}

// Favicon for SERP preview
const faviconUrl = computed(() => {
  const iconTags = state.value.tags.filter(
    t => t.tag === 'link' && ['icon'].includes(t.props?.rel || ''),
  )
  const ico = iconTags.find(t => t.props?.href?.includes('favicon.ico'))
  return ico?.props?.href || iconTags[0]?.props?.href || null
})

const richPreviews = computed<RichPreview[]>(() => {
  const seen = new Set<string>()
  return richResultNodes.value.map((node) => {
    const type = getNodeType(node)
    const analysis = analyzeNodeProperties(node)
    const links = nodeToSchemaOrgLink(type)
    const eligibility = analysis.missingRequired.length > 0
      ? 'ineligible'
      : analysis.missingRecommended.length > 0
        ? 'partial'
        : 'eligible'

    const base: RichPreview = {
      type,
      icon: getSchemaIcon(type),
      label: getNodeDescription(node),
      features: [],
      eligibility,
      missingRequired: analysis.missingRequired,
      documentationUrl: links.googlePage || undefined,
    }

    // Extract rating if present (shared across many types)
    const rating = node.aggregateRating || node.reviewRating
    if (rating) {
      base.rating = {
        value: Number(rating.ratingValue || 0),
        count: Number(rating.ratingCount || rating.reviewCount || 0),
        max: Number(rating.bestRating || 5),
      }
    }

    switch (type) {
      case 'Product': {
        const offer = node.offers?.[0] || node.offers || {}
        if (offer.price)
          base.price = `${offer.priceCurrency || '$'}${offer.price}`
        if (offer.availability)
          base.features.push({ icon: 'i-carbon-delivery-truck', text: offer.availability.replace('https://schema.org/', '') })
        break
      }
      case 'Recipe': {
        if (node.totalTime || node.cookTime)
          base.features.push({ icon: 'i-carbon-time', text: formatDuration(node.totalTime || node.cookTime) })
        if (node.recipeYield)
          base.features.push({ icon: 'i-carbon-restaurant', text: `Serves ${node.recipeYield}` })
        if (node.nutrition?.calories)
          base.features.push({ icon: 'i-carbon-meter', text: node.nutrition.calories })
        break
      }
      case 'Event': {
        if (node.startDate)
          base.eventDate = formatEventDate(node.startDate)
        if (node.location?.name || node.location?.address?.addressLocality)
          base.eventLocation = node.location.name || node.location.address.addressLocality
        break
      }
      case 'FAQPage': {
        const entities = asArray(node.mainEntity || [])
        base.faqItems = entities.slice(0, 4).map((q: any) => ({
          question: q.name || q.text || 'Question',
        }))
        break
      }
      case 'BreadcrumbList': {
        const items = asArray(node.itemListElement || [])
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
        base.breadcrumbs = items.map((i: any) => i.name || i.item?.name || 'Page').slice(0, 5)
        break
      }
      case 'VideoObject': {
        base.videoThumbnail = node.thumbnailUrl
        if (node.duration)
          base.videoDuration = formatDuration(node.duration)
        break
      }
      case 'Article':
      case 'NewsArticle':
      case 'BlogPosting': {
        if (node.datePublished)
          base.features.push({ icon: 'i-carbon-calendar', text: formatEventDate(node.datePublished) })
        if (node.author?.name)
          base.features.push({ icon: 'i-carbon-user', text: node.author.name })
        break
      }
      case 'JobPosting': {
        if (node.hiringOrganization?.name)
          base.features.push({ icon: 'i-carbon-building', text: node.hiringOrganization.name })
        if (node.baseSalary?.value)
          base.features.push({ icon: 'i-carbon-currency', text: `${node.baseSalary.currency || ''}${node.baseSalary.value}` })
        if (node.jobLocation?.address?.addressLocality)
          base.features.push({ icon: 'i-carbon-location', text: node.jobLocation.address.addressLocality })
        break
      }
      case 'LocalBusiness':
      case 'Restaurant': {
        if (node.address?.streetAddress || node.address?.addressLocality)
          base.features.push({ icon: 'i-carbon-location', text: node.address.streetAddress || node.address.addressLocality })
        if (node.telephone)
          base.features.push({ icon: 'i-carbon-phone', text: node.telephone })
        if (node.priceRange)
          base.features.push({ icon: 'i-carbon-currency', text: node.priceRange })
        break
      }
      case 'SoftwareApplication': {
        if (node.applicationCategory)
          base.features.push({ icon: 'i-carbon-category', text: node.applicationCategory })
        const appOffer = node.offers?.[0] || node.offers || {}
        if (appOffer.price)
          base.price = appOffer.price === '0' ? 'Free' : `${appOffer.priceCurrency || '$'}${appOffer.price}`
        break
      }
      case 'Course': {
        if (node.provider?.name)
          base.features.push({ icon: 'i-carbon-education', text: node.provider.name })
        break
      }
      case 'Organization': {
        if (node.name)
          base.features.push({ icon: 'i-carbon-building', text: node.name })
        if (node.url)
          base.features.push({ icon: 'i-carbon-link', text: node.url })
        if (node.telephone)
          base.features.push({ icon: 'i-carbon-phone', text: node.telephone })
        break
      }
      case 'SearchAction': {
        if (node.target)
          base.features.push({ icon: 'i-carbon-search', text: typeof node.target === 'string' ? node.target : node.target?.urlTemplate || 'Sitelinks searchbox' })
        break
      }
      case 'WebSite': {
        if (node.name)
          base.features.push({ icon: 'i-carbon-globe', text: node.name })
        if (node.url)
          base.features.push({ icon: 'i-carbon-link', text: node.url })
        break
      }
    }
    return base
  }).filter((preview) => {
    // Dedupe by type + name + url to collapse equivalent nodes (e.g. duplicate Organization @ids)
    const key = `${preview.type}::${preview.label}::${preview.features.find(f => f.icon === 'i-carbon-link')?.text || ''}`
    if (seen.has(key))
      return false
    seen.add(key)
    return true
  })
})

function formatDuration(iso: string): string {
  if (!iso)
    return ''
  const match = iso.match(DURATION_RE)
  if (!match)
    return iso
  const parts = []
  if (match[1])
    parts.push(`${match[1]}h`)
  if (match[2])
    parts.push(`${match[2]}m`)
  if (match[3] && !match[1])
    parts.push(`${match[3]}s`)
  return parts.join(' ') || iso
}

function formatEventDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  catch {
    return dateStr
  }
}

function renderStars(value: number, max: number = 5): string {
  const filled = Math.round(value)
  return '★'.repeat(Math.min(filled, max)) + '☆'.repeat(Math.max(0, max - filled))
}
</script>

<template>
  <div class="space-y-4">
    <!-- SERP Preview -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-search" class="text-lg" />
            <span class="font-medium">Google Search Preview</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="px-2 py-1 text-xs rounded"
              :class="previewMode === 'desktop' ? 'bg-elevated font-medium' : 'text-muted'"
              @click="previewMode = 'desktop'"
            >
              <UIcon name="i-carbon-laptop" class="text-sm" />
            </button>
            <button
              class="px-2 py-1 text-xs rounded"
              :class="previewMode === 'mobile' ? 'bg-elevated font-medium' : 'text-muted'"
              @click="previewMode = 'mobile'"
            >
              <UIcon name="i-carbon-mobile" class="text-sm" />
            </button>
          </div>
        </div>
      </template>
      <div class="flex justify-center">
        <div
          class="serp-preview-container transition-all duration-300"
          :class="previewMode === 'mobile' ? 'serp-preview-container--mobile' : ''"
        >
          <div class="serp-preview">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-[26px] h-[26px] rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <img v-if="faviconUrl" :src="faviconUrl" alt="" class="w-3.5 h-3.5 object-contain">
                <UIcon v-else name="i-carbon-earth" class="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <!-- Breadcrumbs replace URL when available -->
              <div v-if="richPreviews.find(r => r.breadcrumbs)" class="serp-rich-breadcrumbs">
                <template v-for="(crumb, ci) in richPreviews.find(r => r.breadcrumbs)!.breadcrumbs" :key="ci">
                  <span>{{ crumb }}</span>
                  <UIcon v-if="ci < richPreviews.find(r => r.breadcrumbs)!.breadcrumbs!.length - 1" name="i-carbon-chevron-right" class="text-[10px] mx-0.5 opacity-50" />
                </template>
              </div>
              <div v-else class="text-xs text-neutral-600 dark:text-[#bdc1c6] leading-tight truncate">
                {{ seo.canonical || 'example.com' }}
              </div>
            </div>
            <h3 class="serp-preview__title" :class="previewMode === 'mobile' ? 'serp-preview__title--mobile' : ''">
              {{ seo.title || 'No title found' }}
            </h3>
            <p class="serp-preview__description">
              {{ seo.description || 'No description found' }}
            </p>

            <!-- Inline rich result enhancements -->
            <template v-for="(preview, pi) in richPreviews" :key="`inline-${pi}`">
              <div v-if="preview.rating" class="flex items-center gap-1.5 mt-1">
                <span class="serp-rich-stars">{{ renderStars(preview.rating.value, preview.rating.max) }}</span>
                <span class="text-xs serp-rich-rating-text">{{ preview.rating.value }}/{{ preview.rating.max }}</span>
                <span v-if="preview.rating.count" class="text-xs serp-rich-rating-text">
                  ({{ preview.rating.count.toLocaleString() }} review{{ preview.rating.count !== 1 ? 's' : '' }})
                </span>
                <span v-if="preview.price" class="text-xs serp-rich-rating-text ml-1">· {{ preview.price }}</span>
              </div>
              <div v-else-if="preview.price" class="text-xs serp-rich-rating-text mt-1">
                {{ preview.price }}
              </div>
              <div v-if="preview.eventDate || preview.eventLocation" class="flex items-center gap-2 text-xs serp-rich-detail mt-1">
                <span v-if="preview.eventDate">{{ preview.eventDate }}</span>
                <span v-if="preview.eventDate && preview.eventLocation" class="opacity-40">·</span>
                <span v-if="preview.eventLocation">{{ preview.eventLocation }}</span>
              </div>
              <div v-if="preview.features.length && !preview.rating" class="flex flex-wrap items-center gap-2 text-xs serp-rich-detail mt-1">
                <template v-for="(feat, fi) in preview.features" :key="fi">
                  <span class="flex items-center gap-1">
                    <UIcon :name="feat.icon" class="text-xs opacity-60" />
                    {{ feat.text }}
                  </span>
                  <span v-if="fi < preview.features.length - 1" class="opacity-30">·</span>
                </template>
              </div>
              <div v-if="preview.faqItems?.length" class="serp-rich-faq mt-2">
                <div v-for="(faq, fi) in preview.faqItems" :key="fi" class="serp-rich-faq-item">
                  <UIcon name="i-carbon-chevron-down" class="text-xs shrink-0 opacity-60" />
                  <span class="text-xs">{{ faq.question }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Rich Results Preview -->
    <UCard v-if="richPreviews.length">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-star" class="text-lg" />
            <span class="font-medium">Rich Results Preview</span>
          </div>
          <UBadge
            :color="richPreviews.every(r => r.eligibility === 'eligible') ? 'success' : richPreviews.some(r => r.eligibility === 'ineligible') ? 'error' : 'warning'"
            variant="subtle"
            size="xs"
          >
            {{ richPreviews.filter(r => r.eligibility === 'eligible').length }}/{{ richPreviews.length }} eligible
          </UBadge>
        </div>
      </template>
      <div class="space-y-3">
        <div v-for="(preview, i) in richPreviews" :key="i" class="serp-rich-result">
          <!-- Header: type + eligibility -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <UIcon :name="preview.icon" class="text-sm" />
              <span class="text-xs font-medium">{{ preview.type }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                :color="preview.eligibility === 'eligible' ? 'success' : preview.eligibility === 'partial' ? 'warning' : 'error'"
                variant="subtle"
                size="xs"
              >
                {{ preview.eligibility === 'eligible' ? 'Eligible' : preview.eligibility === 'partial' ? 'Partial' : 'Missing required' }}
              </UBadge>
              <a v-if="preview.documentationUrl" :href="preview.documentationUrl" target="_blank" rel="noopener noreferrer" class="text-muted hover:text-default">
                <UIcon name="i-carbon-launch" class="text-xs" />
              </a>
            </div>
          </div>

          <!-- Missing required warning -->
          <DevtoolsAlert v-if="preview.missingRequired.length" variant="error" class="mb-2">
            Missing required: <code v-for="prop in preview.missingRequired" :key="prop" class="bg-elevated px-1 py-0.5 rounded text-xs mx-0.5">{{ prop }}</code>
          </DevtoolsAlert>

          <!-- Visual Preview Mockup -->
          <div class="serp-rich-mockup">
            <!-- Breadcrumbs (replaces URL in the SERP result) -->
            <div v-if="preview.breadcrumbs" class="serp-rich-breadcrumbs">
              <template v-for="(crumb, ci) in preview.breadcrumbs" :key="ci">
                <span>{{ crumb }}</span>
                <UIcon v-if="ci < preview.breadcrumbs.length - 1" name="i-carbon-chevron-right" class="text-[10px] mx-0.5 opacity-50" />
              </template>
            </div>

            <!-- Star Rating -->
            <div v-if="preview.rating" class="flex items-center gap-1.5">
              <span class="serp-rich-stars">{{ renderStars(preview.rating.value, preview.rating.max) }}</span>
              <span class="text-xs serp-rich-rating-text">{{ preview.rating.value }}/{{ preview.rating.max }}</span>
              <span v-if="preview.rating.count" class="text-xs serp-rich-rating-text">
                ({{ preview.rating.count.toLocaleString() }} review{{ preview.rating.count !== 1 ? 's' : '' }})
              </span>
              <span v-if="preview.price" class="text-xs serp-rich-rating-text ml-1">· {{ preview.price }}</span>
            </div>

            <!-- Price without rating -->
            <div v-else-if="preview.price" class="text-xs serp-rich-rating-text">
              {{ preview.price }}
            </div>

            <!-- Event details -->
            <div v-if="preview.eventDate || preview.eventLocation" class="flex items-center gap-2 text-xs serp-rich-detail">
              <span v-if="preview.eventDate">{{ preview.eventDate }}</span>
              <span v-if="preview.eventDate && preview.eventLocation" class="opacity-40">·</span>
              <span v-if="preview.eventLocation">{{ preview.eventLocation }}</span>
            </div>

            <!-- Video thumbnail -->
            <div v-if="preview.videoThumbnail" class="flex items-center gap-2 mt-1">
              <div class="serp-rich-video-thumb">
                <img :src="preview.videoThumbnail" :alt="preview.label" class="w-full h-full object-cover rounded">
                <div class="serp-rich-video-play">
                  <UIcon name="i-carbon-play-filled" class="text-white text-sm" />
                </div>
                <span v-if="preview.videoDuration" class="serp-rich-video-duration">{{ preview.videoDuration }}</span>
              </div>
            </div>

            <!-- FAQ items -->
            <div v-if="preview.faqItems?.length" class="serp-rich-faq">
              <div v-for="(faq, fi) in preview.faqItems" :key="fi" class="serp-rich-faq-item">
                <UIcon name="i-carbon-chevron-down" class="text-xs shrink-0 opacity-60" />
                <span class="text-xs">{{ faq.question }}</span>
              </div>
              <div v-if="richResultNodes.find(n => getNodeType(n) === 'FAQPage')?.mainEntity?.length > 4" class="text-xs serp-rich-rating-text mt-1">
                + {{ asArray(richResultNodes.find(n => getNodeType(n) === 'FAQPage')?.mainEntity || []).length - 4 }} more questions
              </div>
            </div>

            <!-- Generic features (articles, jobs, businesses, etc.) -->
            <div v-if="preview.features.length" class="flex flex-wrap items-center gap-2 text-xs serp-rich-detail">
              <template v-for="(feat, fi) in preview.features" :key="fi">
                <span class="flex items-center gap-1">
                  <UIcon :name="feat.icon" class="text-xs opacity-60" />
                  {{ feat.text }}
                </span>
                <span v-if="fi < preview.features.length - 1" class="opacity-30">·</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Title & Description lengths -->
    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-text-short-paragraph" class="text-lg" />
            <span class="font-medium">Title</span>
          </div>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="serp-length-status" :class="`serp-length-status--${tColor}`">
              {{ lengthStatusLabel(tColor) }}
            </span>
            <span class="text-xs font-mono text-muted">
              {{ titleLen }}/{{ SEO_LIMITS.TITLE_MAX_CHARS }} chars · ~{{ estimatePixelWidth(seo.title || '') }}px
            </span>
          </div>
          <div
            class="serp-progress-track"
            role="progressbar"
            :aria-valuenow="titleLen"
            :aria-valuemin="0"
            :aria-valuemax="SEO_LIMITS.TITLE_MAX_CHARS"
            :aria-label="`Title length: ${titleLen} of ${SEO_LIMITS.TITLE_MAX_CHARS} characters`"
          >
            <div
              class="serp-progress-fill"
              :class="`serp-progress-fill--${tColor}`"
              :style="{ width: `${Math.min(100, (titleLen / SEO_LIMITS.TITLE_MAX_CHARS) * 100)}%` }"
            />
            <div class="serp-progress-marker" :style="{ left: `${(30 / SEO_LIMITS.TITLE_MAX_CHARS) * 100}%` }" />
          </div>
          <p class="text-xs text-muted truncate">
            {{ seo.title || 'Not set' }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-text-align-left" class="text-lg" />
            <span class="font-medium">Description</span>
          </div>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="serp-length-status" :class="`serp-length-status--${dColor}`">
              {{ lengthStatusLabel(dColor) }}
            </span>
            <span class="text-xs font-mono text-muted">
              {{ descLen }}/{{ SEO_LIMITS.DESC_MAX_CHARS }} chars
            </span>
          </div>
          <div
            class="serp-progress-track"
            role="progressbar"
            :aria-valuenow="descLen"
            :aria-valuemin="0"
            :aria-valuemax="SEO_LIMITS.DESC_MAX_CHARS"
            :aria-label="`Description length: ${descLen} of ${SEO_LIMITS.DESC_MAX_CHARS} characters`"
          >
            <div
              class="serp-progress-fill"
              :class="`serp-progress-fill--${dColor}`"
              :style="{ width: `${Math.min(100, (descLen / SEO_LIMITS.DESC_MAX_CHARS) * 100)}%` }"
            />
            <div class="serp-progress-marker" :style="{ left: `${(SEO_LIMITS.DESC_WARN_CHARS / SEO_LIMITS.DESC_MAX_CHARS) * 100}%` }" />
          </div>
          <p class="text-xs text-muted truncate">
            {{ seo.description || 'Not set' }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- SEO Checklist -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-task" class="text-lg" />
            <span class="font-medium">SEO Checklist</span>
          </div>
          <UBadge
            :color="checklistScore.passed === checklistScore.total ? 'success' : 'warning'"
            variant="subtle"
            size="xs"
          >
            {{ checklistScore.passed }}/{{ checklistScore.total }} passed
          </UBadge>
        </div>
      </template>
      <div class="space-y-1">
        <div
          v-for="item in checklist"
          :key="item.label"
          class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-elevated transition-colors"
        >
          <UIcon :name="checkIcon(item.status)" :class="checkIconColor(item.status)" class="text-sm shrink-0" />
          <span class="text-sm font-mono">{{ item.label }}</span>
          <span class="text-xs text-muted ml-auto truncate max-w-[250px]">{{ item.detail }}</span>
        </div>
      </div>
    </UCard>

    <!-- Title Template & Meta Info -->
    <div class="grid md:grid-cols-2 gap-4">
      <!-- Title Template -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-string-text" class="text-lg" />
            <span class="font-medium">Title Template</span>
          </div>
        </template>
        <div v-if="hasTitleTemplate" class="space-y-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-elevated">
              <span class="text-xs text-muted shrink-0">Template</span>
              <span class="text-sm font-mono ml-auto truncate">{{ titleTemplate }}</span>
            </div>
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-md">
              <span class="text-xs text-muted shrink-0">Separator</span>
              <code class="text-sm font-mono ml-auto bg-elevated px-1.5 py-0.5 rounded">{{ separator }}</code>
            </div>
            <div v-if="templateParams && Object.keys(templateParams).length" class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-elevated">
              <span class="text-xs text-muted shrink-0">Params</span>
              <span class="text-xs font-mono ml-auto truncate max-w-[200px]">{{ JSON.stringify(templateParams) }}</span>
            </div>
          </div>
          <div class="border-t border-default pt-2">
            <span class="text-xs text-muted">Resolved title</span>
            <p class="text-sm font-mono mt-1">
              {{ seo.title || 'Not set' }}
            </p>
          </div>
        </div>
        <div v-else class="text-sm text-muted">
          No title template configured. The title is set directly.
        </div>
      </UCard>

      <!-- Canonical & Robots -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-settings-adjust" class="text-lg" />
            <span class="font-medium">Crawl Settings</span>
          </div>
        </template>
        <DevtoolsKeyValue
          :items="[
            { key: 'canonical', value: seo.canonical || undefined, copyable: true },
            { key: 'robots', value: seo.robots || undefined },
          ]"
          striped
        />
        <DevtoolsAlert
          v-if="seo.robots?.includes('noindex')"
          variant="error"
          icon="i-carbon-warning"
          class="mt-3"
        >
          This page has <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">noindex</code> set. It will not appear in search results.
        </DevtoolsAlert>
      </UCard>
    </div>

    <!-- OG vs SERP Comparison -->
    <UCard v-if="ogMismatches.length > 0 || seo.ogTitle || seo.ogDescription">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-carbon-compare" class="text-lg" />
            <span class="font-medium">SERP vs Open Graph</span>
          </div>
          <UBadge v-if="ogMismatches.length" color="info" variant="subtle" size="xs">
            {{ ogMismatches.length }} difference{{ ogMismatches.length > 1 ? 's' : '' }}
          </UBadge>
          <UBadge v-else color="success" variant="subtle" size="xs">
            Matching
          </UBadge>
        </div>
      </template>
      <div v-if="ogMismatches.length" class="space-y-3">
        <div v-for="m in ogMismatches" :key="m.field" class="space-y-1">
          <span class="text-xs font-medium text-muted uppercase tracking-wide">{{ m.field }}</span>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-elevated rounded-md p-2">
              <span class="text-[10px] text-muted uppercase tracking-wide block mb-1">Search</span>
              <p class="text-xs font-mono truncate">
                {{ m.serp }}
              </p>
            </div>
            <div class="bg-elevated rounded-md p-2">
              <span class="text-[10px] text-muted uppercase tracking-wide block mb-1">Social</span>
              <p class="text-xs font-mono truncate">
                {{ m.og }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-muted">
        Open Graph tags match your search engine metadata. Social shares will display the same content as search results.
      </div>
    </UCard>

    <!-- Multi-Engine Compatibility -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-earth-americas" class="text-lg" />
          <span class="font-medium">Search Engine Compatibility</span>
        </div>
      </template>
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-default">
          <tr class="text-left text-muted border-b border-default">
            <th class="p-2 font-medium">
              Engine
            </th>
            <th class="p-2 font-medium">
              Title
            </th>
            <th class="p-2 font-medium">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="engine in engines"
            :key="engine.key"
            class="border-b border-default last:border-0 hover:bg-elevated transition-colors"
          >
            <td class="p-2">
              <div class="flex items-center gap-1.5">
                <UIcon :name="engine.icon" class="text-sm" />
                <span>{{ engine.label }}</span>
              </div>
            </td>
            <td class="p-2">
              <div class="flex items-center gap-1.5">
                <UIcon
                  :name="checkIcon(engine.titleStatus)"
                  :class="checkIconColor(engine.titleStatus)"
                  class="text-xs"
                />
                <span class="font-mono text-xs">{{ engine.titleLen }}/{{ engine.titleMax }}</span>
              </div>
            </td>
            <td class="p-2">
              <div class="flex items-center gap-1.5">
                <UIcon
                  :name="checkIcon(engine.descStatus)"
                  :class="checkIconColor(engine.descStatus)"
                  class="text-xs"
                />
                <span class="font-mono text-xs">{{ engine.descLen }}/{{ engine.descMax }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <!-- Keyword Analysis -->
    <UCard v-if="keywords.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-carbon-tag-group" class="text-lg" />
          <span class="font-medium">Keyword Analysis</span>
        </div>
      </template>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="kw in keywords"
          :key="kw.word"
          class="serp-keyword-chip"
        >
          {{ kw.word }}
          <span v-if="kw.count > 1" class="serp-keyword-count">{{ kw.count }}</span>
        </span>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
/* SERP preview */
.serp-preview-container {
  padding: 1.25rem;
  border-radius: 8px;
  background: white;
  border: 1px solid oklch(0% 0 0 / 0.08);
  width: 100%;
  max-width: 600px;
}
.dark .serp-preview-container {
  background: #202124;
  border-color: oklch(100% 0 0 / 0.06);
}
.serp-preview-container--mobile {
  max-width: 360px;
}
.serp-preview__title {
  font-size: 1.25rem;
  line-height: 1.3;
  color: #1a0dab;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.serp-preview__title--mobile {
  font-size: 1rem;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.dark .serp-preview__title { color: #8ab4f8; }
.serp-preview__description {
  font-size: 0.875rem;
  line-height: 1.58;
  color: #4d5156;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dark .serp-preview__description { color: #bdc1c6; }

/* Length status */
.serp-length-status {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
}
.serp-length-status--success { background: oklch(75% 0.15 145 / 0.12); color: oklch(50% 0.15 145); }
.serp-length-status--warning { background: oklch(75% 0.12 80 / 0.12); color: oklch(55% 0.15 80); }
.serp-length-status--error { background: oklch(65% 0.15 25 / 0.1); color: oklch(55% 0.18 25); }
.dark .serp-length-status--success { background: oklch(50% 0.15 145 / 0.15); color: oklch(75% 0.18 145); }
.dark .serp-length-status--warning { background: oklch(55% 0.12 80 / 0.15); color: oklch(75% 0.15 80); }
.dark .serp-length-status--error { background: oklch(50% 0.12 25 / 0.15); color: oklch(72% 0.15 25); }

/* Progress bar */
.serp-progress-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--ui-bg-accented);
  overflow: visible;
}
.serp-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .serp-progress-fill {
    transition: none;
  }
}
.serp-progress-fill--success { background: oklch(65% 0.2 145); box-shadow: 0 0 8px oklch(65% 0.2 145 / 0.3); }
.serp-progress-fill--warning { background: oklch(70% 0.18 80); box-shadow: 0 0 8px oklch(70% 0.18 80 / 0.3); }
.serp-progress-fill--error { background: oklch(62% 0.2 25); box-shadow: 0 0 8px oklch(62% 0.2 25 / 0.3); }
.serp-progress-marker {
  position: absolute;
  top: -2px;
  width: 1px;
  height: 10px;
  background: var(--ui-text-muted);
  opacity: 0.4;
}

/* Keyword chips */
.serp-keyword-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  background: var(--ui-bg-elevated);
  color: var(--ui-text-default);
  border: 1px solid var(--ui-border);
}
.serp-keyword-count {
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--ui-bg-accented);
  color: var(--ui-text-muted);
  padding: 0 0.375rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  text-align: center;
}

/* Rich Results */
.serp-rich-result {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
}
.serp-rich-result + .serp-rich-result {
  margin-top: 0.5rem;
}
.serp-rich-mockup {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: white;
  border: 1px solid oklch(0% 0 0 / 0.06);
}
.dark .serp-rich-mockup {
  background: #202124;
  border-color: oklch(100% 0 0 / 0.06);
}
.serp-rich-stars {
  color: #e8a435;
  font-size: 0.8125rem;
  letter-spacing: -1px;
}
.serp-rich-rating-text {
  color: #70757a;
}
.dark .serp-rich-rating-text {
  color: #9aa0a6;
}
.serp-rich-detail {
  color: #4d5156;
  margin-top: 0.25rem;
}
.dark .serp-rich-detail {
  color: #bdc1c6;
}
.serp-rich-breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.125rem;
  font-size: 0.75rem;
  color: #202124;
  margin-bottom: 0.375rem;
}
.dark .serp-rich-breadcrumbs {
  color: #bdc1c6;
}
.serp-rich-faq {
  margin-top: 0.375rem;
}
.serp-rich-faq-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0;
  border-top: 1px solid oklch(0% 0 0 / 0.06);
  color: #1a0dab;
}
.dark .serp-rich-faq-item {
  border-top-color: oklch(100% 0 0 / 0.08);
  color: #8ab4f8;
}
.serp-rich-video-thumb {
  position: relative;
  width: 120px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--ui-bg-accented);
}
.serp-rich-video-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0% 0 0 / 0.3);
}
.serp-rich-video-duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  background: oklch(0% 0 0 / 0.7);
  color: white;
  padding: 0.0625rem 0.25rem;
  border-radius: 3px;
}
</style>
