import type {
  Arrayable,
  Identity,
  NodeRelation,
  NodeRelations,
  PropertyValue,
  ResolvableDate,
  Thing,
} from '../../types'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import {
  resolvableDateToIso,
  resolveDefaultType,
  resolveWithBase,
} from '../../utils'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'

/**
 * Represents a data download distribution.
 */
export interface DataDownload extends Thing {
  '@type'?: 'DataDownload'
  /**
   * The direct download URL for the dataset file.
   */
  'contentUrl': string
  /**
   * The file format of the distribution (e.g., "CSV", "JSON", "XML", "application/json").
   */
  'encodingFormat'?: string
  /**
   * The size of the file in bytes or human-readable format (e.g., "1.5 MB").
   */
  'contentSize'?: string
}

/**
 * Represents a data catalog that contains this dataset.
 */
export interface DataCatalog extends Thing {
  '@type'?: 'DataCatalog'
  /**
   * The name of the data catalog.
   */
  'name'?: string
  /**
   * The URL of the data catalog.
   */
  'url'?: string
}

export interface DatasetSimple extends Thing {
  '@type'?: Arrayable<'Dataset'>
  /**
   * The name of the dataset.
   * This is a required field for valid Dataset structured data.
   */
  'name': string
  /**
   * A short summary describing the dataset.
   * This is a required field for valid Dataset structured data.
   */
  'description': string
  /**
   * An alternate name for the dataset.
   */
  'alternateName'?: Arrayable<string>
  /**
   * The location of a page describing the dataset.
   */
  'url'?: string
  /**
   * Keywords or tags used to describe the dataset.
   * Multiple entries in a keywords list are delimited by commas.
   */
  'keywords'?: Arrayable<string>
  /**
   * The creator or author of this dataset.
   * Can be a Person or Organization, or a reference by ID.
   */
  'creator'?: NodeRelations<Identity>
  /**
   * A person or organization that funded the dataset.
   */
  'funder'?: NodeRelations<Identity>
  /**
   * Identifies academic articles that are recommended by the data provider.
   * Can be the article text, URL, or DOI.
   */
  'citation'?: Arrayable<string>
  /**
   * A license document that applies to this content, typically indicated by URL.
   * Can also be the license text.
   */
  'license'?: Arrayable<string | Thing>
  /**
   * The time period that the dataset covers, in ISO 8601 format.
   * Examples:
   * - Single date: "2008"
   * - Time period: "2007-03-01T13:00:00Z/2008-05-11T15:30:00Z"
   * - Open-ended: "2007-03-01T13:00:00Z/.."
   */
  'temporalCoverage'?: string
  /**
   * The geographic area covered by the dataset.
   * Can be a place name, coordinates, or a shape.
   */
  'spatialCoverage'?: Arrayable<string | Thing>
  /**
   * A download location for the dataset or a DataDownload object with distribution information.
   */
  'distribution'?: NodeRelations<DataDownload>
  /**
   * Datasets included in this dataset.
   */
  'hasPart'?: NodeRelations<Dataset | string>
  /**
   * A dataset that contains this dataset.
   */
  'isPartOf'?: NodeRelations<Dataset | string>
  /**
   * The variables that are measured in the dataset.
   * Can be text descriptions or PropertyValue objects.
   */
  'variableMeasured'?: Arrayable<string | Thing>
  /**
   * The technique, technology, or methodology used in the dataset.
   */
  'measurementTechnique'?: Arrayable<string | Thing>
  /**
   * A data catalog which contains this dataset.
   */
  'includedInDataCatalog'?: NodeRelation<DataCatalog>
  /**
   * Indicates whether the dataset is accessible for free.
   */
  'isAccessibleForFree'?: boolean
  /**
   * The date on which the dataset was published, in ISO 8601 format.
   */
  'datePublished'?: ResolvableDate
  /**
   * The date on which the dataset was most recently modified, in ISO 8601 format.
   */
  'dateModified'?: ResolvableDate
  /**
   * The version number or identifier for this dataset.
   */
  'version'?: number | string
  /**
   * A link to the license document or terms of use.
   */
  'sameAs'?: Arrayable<string>
  /**
   * An identifier for the dataset, such as a DOI.
   */
  'identifier'?: Arrayable<PropertyValue | string>
}

export interface Dataset extends DatasetSimple {}

export const PrimaryDatasetId = '#dataset'

const dataDownloadResolver = defineSchemaOrgResolver<DataDownload>({
  defaults: {
    '@type': 'DataDownload',
  },
  resolve(node, ctx) {
    node.contentUrl = resolveWithBase(ctx.meta.host, node.contentUrl)
    return node
  },
})

const dataCatalogResolver = defineSchemaOrgResolver<DataCatalog>({
  defaults: {
    '@type': 'DataCatalog',
  },
  resolve(node, ctx) {
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})

/**
 * Describes a Dataset on a WebPage.
 * A dataset is a body of structured information describing some topic(s) of interest.
 */
export const datasetResolver = defineSchemaOrgResolver<Dataset>({
  defaults: {
    '@type': 'Dataset',
  },
  inheritMeta: [
    'description',
    'url',
    'dateModified',
    'datePublished',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', PrimaryDatasetId],
  resolve(node, ctx) {
    resolveDefaultType(node, 'Dataset')

    // Resolve relationships
    node.creator = resolveIdentityRelation(node.creator, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    })
    node.funder = resolveIdentityRelation(node.funder, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    })
    node.distribution = resolveRelation(node.distribution, ctx, dataDownloadResolver)
    node.includedInDataCatalog = resolveRelation(node.includedInDataCatalog, ctx, dataCatalogResolver)
    const resolveDatasetRelations = (input: NodeRelations<Dataset | string> | undefined) => {
      if (!input)
        return input
      const values = Array.isArray(input) ? input : [input]
      const resolved = values.map(value => typeof value === 'string'
        ? resolveWithBase(ctx.meta.host, value)
        : resolveRelation(value, ctx, datasetResolver))
      return Array.isArray(input) ? resolved : resolved[0]
    }
    node.hasPart = resolveDatasetRelations(node.hasPart)
    node.isPartOf = resolveDatasetRelations(node.isPartOf)

    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    if (node.sameAs) {
      node.sameAs = Array.isArray(node.sameAs)
        ? node.sameAs.map(url => resolveWithBase(ctx.meta.host, url))
        : resolveWithBase(ctx.meta.host, node.sameAs)
    }
    if (node.license) {
      const licenses = Array.isArray(node.license) ? node.license : [node.license]
      const resolved = licenses.map(license => typeof license === 'string' ? resolveWithBase(ctx.meta.host, license) : license)
      node.license = Array.isArray(node.license) ? resolved : resolved[0]
    }

    // Resolve dates
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)

    return node
  },
})
