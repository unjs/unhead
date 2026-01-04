## Schema.org Dataset

**Type**: `defineDataset(input?: Dataset)`{lang="ts"}

  Describes a research dataset for scientific, academic, or data science purposes.

## Useful Links

- [Dataset - Schema.org](https://schema.org/Dataset)
- [Dataset Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/dataset)
- [Google Dataset Search](https://datasetsearch.research.google.com/)

## Required properties

- **name** `string`

  The name of the dataset. This is a required field for valid Dataset structured data.

- **description** `string`

  A short summary describing the dataset. This is a required field for valid Dataset structured data.

## Recommended Properties

- **creator** `NodeRelations<Person | Organization | string>`

  The person or organization who created the dataset. Resolves to [Person](/docs/schema-org/api/schema/person) or [Organization](/docs/schema-org/api/schema/organization).

- **distribution** `NodeRelations<DataDownload>`

  Information about how to access/download the dataset.

- **temporalCoverage** `string`

  The time period the dataset covers (ISO 8601 format, e.g., "2020-01-01/2024-12-31").

- **spatialCoverage** `string`

  The geographic area the dataset covers.

- **keywords** `string[]`

  Keywords describing the dataset.

- **license** `string`

  URL or text specifying the dataset's license.

## Defaults

- **@type**: `Dataset`
- **@id**: `${canonicalUrl}#dataset`
- **description**: `currentRouteMeta.description` _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_
- **url**: `currentRouteMeta.url` _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_
- **dateModified**: `currentRouteMeta.dateModified` _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_
- **datePublished**: `currentRouteMeta.datePublished` _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_

## Examples

### Minimal

```ts
defineDataset({
  name: 'Global Temperature Data 2000-2024',
  description: 'Comprehensive global temperature measurements from weather stations worldwide',
})
```

### Complete

```ts
defineDataset({
  name: 'Global Temperature Data 2000-2024',
  description: 'Comprehensive global temperature measurements from weather stations worldwide, including daily readings and anomaly calculations',
  url: 'https://example.com/datasets/global-temp-2000-2024',
  creator: {
    name: 'Climate Research Institute',
    url: 'https://example.com/about',
  },
  datePublished: new Date(2024, 0, 1),
  dateModified: new Date(2024, 11, 1),
  version: '2.0',
  keywords: ['climate', 'temperature', 'weather', 'global warming'],
  license: 'https://creativecommons.org/licenses/by/4.0/',
  temporalCoverage: '2000-01-01/2024-12-31',
  spatialCoverage: 'Global',
  distribution: {
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
  'keywords'?: string[]
  'creator'?: NodeRelations<Identity>
  'citation'?: string | string[]
  'license'?: string
  'temporalCoverage'?: string
  'spatialCoverage'?: string
  'distribution'?: NodeRelations<DataDownload>
  'variableMeasured'?: string | string[]
  'includedInDataCatalog'?: NodeRelation<DataCatalog>
  'isAccessibleForFree'?: boolean
  'datePublished'?: ResolvableDate
  'dateModified'?: ResolvableDate
  'version'?: string | number
  'sameAs'?: string[]
  'identifier'?: string | string[]
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization) - Dataset publisher
- [Person](/docs/schema-org/api/schema/person) - Dataset creator
