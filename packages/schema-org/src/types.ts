import type { SchemaOrgGraph } from './core'
import type { ImageObject, Organization, Person } from './nodes'

export type Arrayable<T> = T | Array<T>
export type NodeRelation<T> = T | IdReference
export type NodeRelations<T> = Arrayable<NodeRelation<T>>
export type Identity = Person | Organization
export type ResolvableDate = string | Date
export type OptionalSchemaOrgPrefix<T extends string> = T | `https://schema.org/${T}`
export interface MetaInput {
  /**
   * Whether to inject the scripts at the end of the body or in the head.
   */
  tagPosition?: 'body' | 'head'

  trailingSlash?: boolean
  host?: string
  url?: string
  path?: string
  currency?: string
  image?: string
  inLanguage?: string
  title?: string
  description?: string
  datePublished?: string
  dateModified?: string
}

/** Metadata after URL and path defaults have been applied. */
export interface ResolvedMeta extends MetaInput {
  path: string
  url: string
}

export interface UserConfig extends MetaInput {}

interface SchemaOrgNodeDefinitionBase<ResolvedInput> {
  alias?: string
  idPrefix?: 'host' | 'url' | ['host' | 'url', string ]
  inheritMeta?: (keyof ResolvedMeta | { key: keyof ResolvedInput, meta: keyof ResolvedMeta })[]
  defaults?: Partial<ResolvedInput> | ((ctx: SchemaOrgGraph) => Partial<ResolvedInput>)
  required?: (keyof ResolvedInput)[]
  resolve?: (node: ResolvedInput, ctx: SchemaOrgGraph) => ResolvedInput
  resolveRootNode?: (node: ResolvedInput, ctx: SchemaOrgGraph) => void
}

export type SchemaOrgNodeDefinition<ResolvedInput = Thing, CastInput = ResolvedInput>
  = SchemaOrgNodeDefinitionBase<ResolvedInput>
    & ([CastInput] extends [ResolvedInput]
      ? { cast?: (node: CastInput, ctx: SchemaOrgGraph) => ResolvedInput }
      : { cast: (node: CastInput, ctx: SchemaOrgGraph) => ResolvedInput })

export interface Thing {
  '@type'?: Arrayable<string>
  '@id'?: Id
  /**
   * A reference-by-ID to the WebPage node.
   */
  'mainEntityOfPage'?: Arrayable<IdReference>
  /**
   * A reference-by-ID to the WebPage node.
   */
  'mainEntity'?: Arrayable<IdReference>
  /**
   * An image object or referenced by ID.
   * - Must be at least 696 pixels wide.
   * - Must be of the following formats+file extensions: .jpg, .png, .gif ,or .webp.
   */
  'image'?: NodeRelations<ImageObject | string>

  /**
   * The work that this work has been translated from. E.g. 物种起源 is a translationOf “On the Origin of Species”.
   */
  'translationOfWork'?: NodeRelations<Thing>
  /**
   * A work that is a translation of the content of this work. E.g. 西遊記 has an English workTranslation “Journey to the West”, a German workTranslation “Monkeys Pilgerfahrt” and a Vietnamese translation Tây du ký bình khảo.
   */
  'workTranslation'?: NodeRelations<Thing>

  /**
   * Allow any arbitrary keys
   */
  [key: string]: unknown
}

export interface SchemaOrgNode extends Thing {
  /**
   * Resolver metadata is intentionally opaque on heterogeneous graph nodes.
   * @internal
   */
  _resolver?: unknown
  _dedupeStrategy?: 'replace' | 'merge'
}

export type WithResolver<T> = T & {
  _resolver?: SchemaOrgNodeDefinition<T>
}

/**
 * A minimal JSON-LD node that refers to another graph node by ID.
 *
 * References are still valid Things. Modelling that relationship keeps
 * resolved relation values assignable to the schema properties they replace
 * without weakening Thing's arbitrary-property boundary back to `any`.
 */
export interface IdReference extends Thing {
  /** IRI identifying the canonical address of this object. */
  '@id': string
}

// we support string for DX
export type Id = string | `#${string}` | `https://${string}#${string}`
