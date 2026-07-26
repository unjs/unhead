---
title: Dataset Schema
description: Use defineDataset() to add Dataset structured data. Make research data discoverable in Google Dataset Search with metadata and download links.
---

## Schema.org Dataset

**Type**: `defineDataset<T extends Record<string, any>>(input?: Dataset & T)`{lang="ts"}

  Describes a research dataset for scientific, academic, or data science purposes.

## Useful Links

- [Dataset - Schema.org](https://schema.org/Dataset)
- [Dataset Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/dataset)
- [Google Dataset Search](https://datasetsearch.research.google.com/)

Google uses Dataset markup for [Dataset Search discovery](https://developers.google.com/search/docs/appearance/structured-data/dataset), not as a rich-result feature in Google Search.

## Required properties

- **name** `string`

  The name of the dataset. Google requires it in the rendered Dataset markup. If you omit it from `defineDataset()`, Unhead uses the resolved page title.

- **description** `string`

  A summary describing the dataset. Google requires 50 to 5,000 characters in the rendered Dataset markup. If you omit it from `defineDataset()`, Unhead uses the resolved page description; make sure that inherited description also meets the [Dataset guidelines](https://developers.google.com/search/docs/appearance/structured-data/dataset#dataset).

## Recommended Properties

- **creator** `NodeRelations<Identity>`

  The person or organization that created the dataset. A plain nested object resolves as a Person; wrap an organization with `defineOrganization()` to select the Organization resolver.

- **distribution** `NodeRelations<DataDownload>`

  Information about how to access or download the dataset. This field is passed through without a DataDownload resolver, so include `@type: 'DataDownload'` in a nested object.

- **temporalCoverage** `string`

  The time period the dataset covers (ISO 8601 format, e.g., "2020-01-01/2024-12-31").

- **spatialCoverage** `Arrayable<string | Thing>`

  The geographic area the dataset covers.

- **keywords** `Arrayable<string>`

  Keywords describing the dataset.

- **license** `string`

  URL or text specifying the dataset's license.

## Defaults

- **@type**: `Dataset`
- **@id**: `${canonicalUrl}#dataset`
- **name**: page title from resolved metadata
- **description**: resolved page description
- **url**: resolved page URL
- **dateModified**: resolved page modification date
- **datePublished**: resolved page publication date

## Examples

### Minimal

```ts
defineDataset({
  name: 'Global Temperature Data 2000-2024',
  description: 'Daily temperature measurements from weather stations worldwide',
})
```

### Detailed example

```ts
defineDataset({
  name: 'Global Temperature Data 2000-2024',
  description: 'Daily temperature readings and anomaly calculations from weather stations worldwide',
  url: 'https://example.com/datasets/global-temp-2000-2024',
  creator: defineOrganization({
    name: 'Climate Research Institute',
    url: 'https://example.com/about',
  }),
  datePublished: new Date(2024, 0, 1),
  dateModified: new Date(2024, 11, 1),
  version: '2.0',
  keywords: ['climate', 'temperature', 'weather', 'global warming'],
  license: 'https://creativecommons.org/licenses/by/4.0/',
  temporalCoverage: '2000-01-01/2024-12-31',
  spatialCoverage: 'Global',
  distribution: {
    '@type': 'DataDownload',
    contentUrl: 'https://example.com/downloads/global-temp-data.csv',
    encodingFormat: 'CSV',
    contentSize: '125 MB',
  },
  variableMeasured: ['temperature', 'humidity', 'pressure'],
  citation: 'Smith, J. et al. (2024). Global Temperature Dataset. Climate Research Institute.',
  isAccessibleForFree: true,
})
```

## Types

```ts
export interface DataDownload extends Thing {
  '@type'?: 'DataDownload'
  'contentUrl'?: string
  'encodingFormat'?: string
  'contentSize'?: string
}

export interface DataCatalog extends Thing {
  '@type'?: 'DataCatalog'
  'name'?: string
  'url'?: string
}

export interface DatasetSimple extends Thing {
  '@type'?: Arrayable<'Dataset'>
  'name': string
  'description': string
  'url'?: string
  'keywords'?: Arrayable<string>
  'creator'?: NodeRelations<Identity>
  'citation'?: Arrayable<string>
  'license'?: string
  'temporalCoverage'?: string
  'spatialCoverage'?: Arrayable<string | Thing>
  'distribution'?: NodeRelations<DataDownload>
  'variableMeasured'?: Arrayable<string | Thing>
  'includedInDataCatalog'?: NodeRelation<DataCatalog>
  'isAccessibleForFree'?: boolean
  'datePublished'?: ResolvableDate
  'dateModified'?: ResolvableDate
  'version'?: string
  'sameAs'?: Arrayable<string>
  'identifier'?: Arrayable<string>
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization): Dataset publisher
- [Person](/docs/schema-org/api/schema/person): Dataset creator
