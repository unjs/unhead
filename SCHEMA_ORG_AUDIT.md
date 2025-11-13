# Schema.org Node Types Audit Report

**Date:** 2025-11-10
**Package:** `@unhead/schema-org`
**Current Implementation:** 37 schema types with dedicated resolvers

---

## Executive Summary

The `@unhead/schema-org` package provides comprehensive coverage of the most common schema.org types needed for Google Rich Results. This audit identifies critical missing types that would enhance SEO capabilities, particularly for media-rich and specialized content.

---

## Currently Implemented Schema Types (37)

### ✅ Core Web Types
- WebSite
- WebPage (with subtypes: AboutPage, CheckoutPage, CollectionPage, ContactPage, FAQPage, ItemPage, MedicalWebPage, ProfilePage, QAPage, RealEstateListing, SearchResultsPage)

### ✅ Identity & Organization
- Organization
- Person

### ✅ Content Types
- Article (supports: Article, BlogPosting, AdvertiserContentArticle, NewsArticle, Report, SatiricalArticle, ScholarlyArticle, SocialMediaPosting, TechArticle)
- Book & BookEdition
- Course
- Event
- HowTo & HowToStep
- Movie
- Question (for FAQ content)
- Recipe
- SoftwareApp
- VideoObject

### ✅ Business & Commerce
- Product
- Offer & AggregateOffer
- LocalBusiness
- FoodEstablishment
- JobPosting

### ✅ Reviews & Ratings
- Review
- AggregateRating
- Comment

### ✅ Supporting Types
- BreadcrumbList
- Image (ImageObject)
- ItemList & ListItem
- PostalAddress
- Place & VirtualLocation
- OpeningHoursSpecification
- SearchAction & ReadAction

### ✅ Internal Supporting Nodes
- DefinedRegion
- MerchantReturnPolicy
- MonetaryAmount
- OfferShippingDetails
- Rating
- ShippingDeliveryTime

---

## Critical Missing Schema Types

### 🔴 HIGH PRIORITY (Rich Results Impact)

#### 1. **Podcast Ecosystem**
- **PodcastSeries** - Defines the entire podcast show
- **PodcastEpisode** - Individual episode details with embedded player support
- **PodcastSeason** - Season organization

**Why Critical:**
- Google actively supports podcast rich results in Search
- Growing audio content consumption
- Episode discovery and embedded players in search results

**Use Cases:** Podcast hosting sites, media companies, educational content

---

#### 2. **Dataset**
- **Dataset** - Research data, scientific datasets, open data

**Why Critical:**
- Required for Google Dataset Search visibility
- Critical for research institutions, government, scientific publications
- Machine learning and data science content discovery

**Use Cases:** Research institutions, data portals, government agencies, ML/AI datasets

---

#### 3. **Music Ecosystem**
- **MusicRecording** - Individual tracks/songs
- **MusicAlbum** - Album collections
- **MusicGroup** - Bands/musical groups
- **MusicPlaylist** - Curated music collections

**Why Critical:**
- Music is a major content vertical
- Artist discovery and music search optimization
- Concert/event integration (works with existing Event type)

**Use Cases:** Music platforms, artist websites, streaming services, music blogs

---

### 🟡 MEDIUM PRIORITY (SEO Value)

#### 4. **TV Content**
- **TVSeries** - TV show series (similar to Movie)
- **TVEpisode** - Individual episodes
- **TVSeason** - Season organization

**Why Important:**
- Complements existing Movie support
- Streaming platform SEO
- Episode discovery

**Use Cases:** Streaming platforms, TV networks, entertainment sites

---

#### 5. **Service**
- **Service** - Service offerings (distinct from Product)

**Why Important:**
- Service-based businesses need distinct markup from products
- Local service providers
- Professional services SEO

**Use Cases:** Consultancies, professional services, repair services, healthcare services

---

#### 6. **Medical/Health Content**
- **MedicalCondition** - Diseases, conditions
- **HealthTopicContent** - General health information

**Why Important:**
- Health content is high-value for search
- E-A-T (Expertise, Authority, Trust) signals
- Medical information discovery

**Use Cases:** Health websites, medical institutions, pharma companies

---

### 🟢 LOWER PRIORITY (Nice to Have)

#### 7. **Educational Credentials**
- **EducationalOccupationalCredential** - Degrees, certifications, licenses

**Why Useful:**
- Educational institution SEO
- Professional certification visibility
- Career development content

---

#### 8. **Visual Art**
- **VisualArtwork** - Paintings, sculptures, digital art

**Why Useful:**
- Art galleries, museums
- Artist portfolios
- NFT platforms

---

#### 9. **Additional Business Types**
- **Store** (more specific than LocalBusiness)
- **ProfessionalService**
- **HealthAndBeautyBusiness**
- **AutoRepair**
- **HomeAndConstructionBusiness**

**Why Useful:**
- More specific local business types
- Enhanced local SEO signals

---

## Google Rich Results Changes (June 2025)

### ⚠️ Recently Deprecated Types (DO NOT Prioritize)

Google removed rich result support for these types:
- ❌ Book Actions
- ❌ Course Info
- ❌ Claim Review
- ❌ Estimated Salary
- ❌ Learning Video
- ❌ Special Announcement
- ❌ Vehicle Listing

**Rationale:** Google stated these are "not commonly used in Search" and no longer provide "significant additional value for users."

---

## Implementation Recommendations

### Phase 1: Media Content (Highest ROI)
1. **PodcastSeries & PodcastEpisode** - Growing audio content market
2. **MusicRecording & MusicAlbum** - Large content vertical
3. **Dataset** - Academic/research content needs

### Phase 2: TV & Services
4. **TVSeries & TVEpisode** - Complement existing Movie support
5. **Service** - Service business market

### Phase 3: Specialized Content
6. **MedicalCondition** - If targeting health content
7. **EducationalOccupationalCredential** - If targeting education sector

---

## Technical Considerations

### Existing Architecture Strengths
- ✅ Excellent subtype support (Article, WebPage already demonstrate this)
- ✅ Strong resolver pattern for complex relationships
- ✅ Auto-inference from meta tags
- ✅ Smart ID management and deduplication
- ✅ Framework-agnostic core

### Implementation Patterns to Follow
- Use existing resolver patterns from similar types:
  - Podcast → similar to VideoObject structure
  - Dataset → similar to Article/CreativeWork
  - MusicRecording → similar to VideoObject
  - TVSeries/TVEpisode → similar to Movie structure

### Testing Requirements
- Each new type needs:
  - TypeScript interface
  - Resolver with defaults
  - Unit tests
  - E2E tests
  - Documentation page

---

## Competitive Analysis

Most schema.org libraries focus on:
- Basic types only (Organization, Person, Product)
- Manual JSON-LD generation
- No smart inference

**@unhead/schema-org advantages:**
- Smart meta tag inference
- Framework integration
- Type safety
- Automatic relationship resolution

**Missing competitive features:**
- Podcast support (competitors like Yoast have this)
- Music schema (specialized music SEO tools have this)
- Dataset support (academic tools have this)

---

## Priority Recommendation

**START WITH:** PodcastSeries & PodcastEpisode

**Reasoning:**
1. High demand in growing audio content market
2. Clear Google Rich Results support
3. Similar structure to existing VideoObject (easier implementation)
4. Wide use case applicability
5. Competitive differentiation

**Alternative START:** Dataset (if targeting academic/research users)

---

## References

- Google Search Central: Structured Data Documentation
- Schema.org: Full specification
- Google Rich Results Test: Validation tool
- Search Engine Land: 2025 Structured Data Trends

---

## Notes

- The package already supports flexible `@type` augmentation, so users can manually add these types as plain objects
- However, dedicated resolver support would provide:
  - Type safety
  - Smart defaults
  - Meta tag inference
  - Relationship resolution
  - Validation

---

**Audit completed by:** Claude Code
**Review recommended:** Product team, SEO specialists
