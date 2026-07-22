---
title: Organization Schema - JSON-LD Guide & Examples
description: Add Organization structured data with Unhead. Describe a company identity, logo, address, contact details, and sameAs profiles.
navigation:
  title: Organization
---

[Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization) can help Google understand administrative details and disambiguate a company or brand. Unhead also references the identity from related nodes such as Article, WebSite, and Product.

## JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Corp",
  "url": "https://acme.com",
  "logo": "https://acme.com/logo.png",
  "sameAs": [
    "https://twitter.com/acme",
    "https://github.com/acme",
    "https://linkedin.com/company/acme"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-555-0199",
    "contactType": "customer service"
  }
}
```

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org Organization

- **Type**: `defineOrganization<T extends Record<string, any>>(input?: Organization & T)`{lang="ts"}

  Describes an organization (a company, business, or institution). It is most commonly used to identify the publisher of a WebSite.

## Useful Links

- [Organization - Schema.org](https://schema.org/Organization)
- [Organization Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Choose an Identity - Organization](/docs/schema-org/guides/recipes/identity#organization)

## Unhead input property

The Unhead `Organization` interface requires `name` when you pass an object. Google has no required Organization properties and instead recommends supplying every relevant property.

- **name** `string`

  The name of the business.

## Recommended Properties

- **logo** `NodeRelation<ImageObject | string>`

  A logo image URL, which may be relative to the site root.

- **sameAs**  `string[]`

  An array of URLs for other profiles or pages that identify the Organization.

- **telephone** `string`

  The telephone number of the organization.

- **email** `string`

  The email address of the organization.

- **foundingDate** `string`

  The date the organization was founded.

## Examples

### Minimal

```ts
defineOrganization({
  name: 'My Site',
  logo: '/logo.png',
  sameAs: [
    'https://www.facebook.com/my-site',
    'https://twitter.com/my-site',
    'https://www.instagram.com/my-site',
    'https://www.youtube.com/my-site',
  ]
})
```

## Defaults

- **@type**: `Organization`
- **@id**: `${canonicalHost}#identity`
- **url**: `canonicalHost`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- address as `PostalAddress` object

- resolves a string `logo` URL into an ImageObject with the ID `#logo`

For example:

```ts
defineOrganization({
  name: 'Nuxt.js',
  logo: '/img/logo.png',
})
```

The logo URL resolves into an ImageObject with the ID `#logo`, referenced by the primary Organization identity.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "https://nuxtjs.org/#identity",
      "@type": "Organization",
      "logo": {
        "@id": "https://nuxtjs.org/#logo"
      },
      "name": "Nuxt.js",
      "url": "https://nuxtjs.org/"
    },
    {
      "@id": "https://nuxtjs.org/#logo",
      "@type": "ImageObject",
      "caption": "Nuxt.js",
      "contentUrl": "https://nuxtjs.org/img/logo.png",
      "url": "https://nuxtjs.org/img/logo.png"
    }
  ]
}
```

## Types

```ts
/**
 * An organization such as a school, NGO, corporation, club, etc.
 */
export interface OrganizationSimple extends Thing {
  /**
   * A reference-by-ID to an image of the organization's logo.
   *
   * - The image must be 112x112px, at a minimum.
   * - Make sure the image looks how you intend it to look on a purely white background
   * (for example, if the logo is mostly white or gray,
   * it may not look how you want it to look when displayed on a white background).
   */
  logo?: NodeRelation<ImageObject | string>
  /**
   * The site's home URL.
   */
  url?: string
  /**
   * The name of the Organization.
   */
  name: string
  /**
   * An array of URLs representing declared social/authoritative profiles of the organization
   * (e.g., a Wikipedia page, or Facebook profile).
   */
  sameAs?: Arrayable<string>
  /**
   * An array of images which represent the organization (including the logo), referenced by ID.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A reference-by-ID to a PostalAddress piece.
   */
  address?: NodeRelations<PostalAddress>
  /**
   * The telephone number of the organization.
   */
  telephone?: string
  /**
   * The email address of the organization.
   */
  email?: string
  /**
   * The date the organization was founded.
   */
  foundingDate?: string
}

export interface Organization extends OrganizationSimple {}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person): Organization members
- [LocalBusiness](/docs/schema-org/api/schema/local-business): Physical locations
